import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api-client';

export interface AppSetting {
    id?: number | string;
    key: string;
    value: any;
}

export function useAppSetting<T>(key: string, defaultValue: T, options?: { debounceMs?: number }) {
    const debounceMs = options?.debounceMs ?? 1000;

    // Expose a way to flush pending saves immediately (useful when you need cross-device persistence)
    const flushRef = useRef<() => Promise<void> | null>(null);
    const { isAuthenticated, token } = useAuth();

    // Initialize from localStorage for immediate availability
    const [value, setValue] = useState<T>(() => {
        try {
            const local = localStorage.getItem(`pkm_setting:${key}`);
            return local ? JSON.parse(local) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    });

    // Keep a ref to latest value for flush to read
    const valueRef = useRef<T>(value);
    useEffect(() => { valueRef.current = value; }, [value]);

    // Serialize immediate saves
    const savePromiseRef = useRef<Promise<void> | null>(null);

    const [loading, setLoading] = useState(false);
    const settingIdRef = useRef<string | number | null>(null);
    const saveTimeoutRef = useRef<any>(null);

    const getHeaders = useCallback((): Record<string, string> => {
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, [token]);



    // Helper: Create the collection if missing
    const ensureCollectionExists = useCallback(async () => {
        try {
            await apiRequest('nocobase', '/collections', {
                method: 'POST',
                headers: getHeaders(),
                data: {
                    name: 'pkm_settings',
                    title: 'PKM Settings',
                    fields: [
                        { name: 'key', type: 'string', unique: true },
                        { name: 'value', type: 'json' }
                    ],
                    hidden: true
                }
            });
            // Wait a moment for propagation
            await new Promise(r => setTimeout(r, 1000));
            return true;
        } catch (err: any) {
            // If it already exists, that's fine too
            if (err.message?.includes('exists')) return true;
            return false;
        }
    }, [getHeaders]);

    // Fetch from Backend on mount
    const fetchSetting = useCallback(async () => {
        if (!isAuthenticated || !token || !localStorage.getItem('nocobase_token')) return;
        setLoading(true);
        try {
            const response = await apiRequest('nocobase', '/pkm_settings', {
                headers: getHeaders(),
                params: {
                    filter: JSON.stringify({ key: { $eq: key } }),
                    pageSize: '1',
                }
            });

            const data = response?.data || [];
            if (data.length > 0) {
                const setting = data[0];
                settingIdRef.current = setting.id;

                if (setting.value !== undefined) {
                    setValue(setting.value);
                    localStorage.setItem(`pkm_setting:${key}`, JSON.stringify(setting.value));
                }
            }
        } catch (err: any) {
            const msg = err.message || '';
            if (!msg.includes('404')) {
                // Ignore silent errors
            }
        } finally {
            setLoading(false);
        }
    }, [key, isAuthenticated, token, getHeaders]);

    // Initial Load
    useEffect(() => {
        fetchSetting();
    }, [fetchSetting]);

    // Save to Backend (Debounced)
    const updateValue = useCallback((newValue: T | ((val: T) => T)) => {
        setValue((prev) => {
            const resolvedValue = newValue instanceof Function ? newValue(prev) : newValue;
            localStorage.setItem(`pkm_setting:${key}`, JSON.stringify(resolvedValue));

            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(async () => {
                if (!isAuthenticated || !token || !localStorage.getItem('nocobase_token')) return;
                const headers = getHeaders();

                const performSave = async (valueToSave: any, retryCount = 0): Promise<void> => {
                    try {
                        // 1. Ensure we have the latest ID before deciding strategy
                        if (!settingIdRef.current) {
                            const found = await apiRequest('nocobase', '/pkm_settings', {
                                headers,
                                params: { filter: JSON.stringify({ key: { $eq: key } }), pageSize: '1' }
                            });
                            if (found?.data?.length > 0) {
                                settingIdRef.current = found.data[0].id;
                            }
                        }

                        // 2. Decide Strategy (PUT if exists, POST if new)
                        if (settingIdRef.current) {
                            await apiRequest('nocobase', `/pkm_settings/${settingIdRef.current}`, {
                                method: 'PUT',
                                headers,
                                data: { value: valueToSave }
                            });
                        } else {
                            const response = await apiRequest('nocobase', '/pkm_settings', {
                                method: 'POST',
                                headers,
                                data: { key, value: valueToSave },
                                silent: true
                            });
                            if (response?.data?.id) {
                                settingIdRef.current = response.data.id;
                            }
                        }
                    } catch (err: any) {
                        const errMsg = (err.message || JSON.stringify(err)).toLowerCase();
                        // Fallback only if we hit a race (another client created it between our check and POST)
                        if (errMsg.includes('exists') || errMsg.includes('unique') || errMsg.includes('400')) {
                            await apiRequest('nocobase', '/pkm_settings:update', {
                                method: 'POST',
                                headers,
                                params: { filter: JSON.stringify({ key }) },
                                data: { value: valueToSave },
                                silent: true
                            });
                            return;
                        }

                        if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('relation "pkm_settings"')) {
                            if (retryCount < 1) {
                                const created = await ensureCollectionExists();
                                if (created) return performSave(valueToSave, retryCount + 1);
                            }
                        }
                    }
                };

                savePromiseRef.current = (savePromiseRef.current || Promise.resolve()).then(() => performSave(resolvedValue)).catch(() => { });
            }, debounceMs);

            return resolvedValue;
        });
    }, [key, isAuthenticated, token, getHeaders, ensureCollectionExists]);

    const flush = useCallback(async (valueToSave?: T) => {
        if (!isAuthenticated || !token || !localStorage.getItem('nocobase_token')) return;
        const headers = getHeaders();
        const toSave = valueToSave === undefined ? valueRef.current : valueToSave;

        const attemptUpsert = async (attempt = 1): Promise<void> => {
            try {
                // 1. Resolve ID first to avoid 400s
                if (!settingIdRef.current) {
                    const found = await apiRequest('nocobase', '/pkm_settings', {
                        headers,
                        params: { filter: JSON.stringify({ key: { $eq: key } }), pageSize: '1' }
                    });
                    if (found?.data?.length > 0) settingIdRef.current = found.data[0].id;
                }

                if (settingIdRef.current) {
                    await apiRequest('nocobase', `/pkm_settings/${settingIdRef.current}`, {
                        method: 'PUT',
                        headers,
                        data: { value: toSave }
                    });
                } else {
                    const response = await apiRequest('nocobase', '/pkm_settings', {
                        method: 'POST',
                        headers,
                        data: { key, value: toSave },
                        silent: true
                    });
                    if (response?.data?.id) settingIdRef.current = response.data.id;
                }
            } catch (err: any) {
                const errMsg = (err.message || JSON.stringify(err)).toLowerCase();

                if (attempt < 2 && (errMsg.includes('exists') || errMsg.includes('unique') || errMsg.includes('400'))) {
                    await apiRequest('nocobase', '/pkm_settings:update', {
                        method: 'POST',
                        headers,
                        params: { filter: JSON.stringify({ key }) },
                        data: { value: toSave },
                        silent: true
                    });
                    return;
                }

                if (attempt < 2 && (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('collection'))) {
                    const ok = await ensureCollectionExists();
                    if (ok) return attemptUpsert(attempt + 1);
                }
                throw err;
            }
        };

        savePromiseRef.current = (savePromiseRef.current || Promise.resolve()).then(() => attemptUpsert()).catch(() => { });
        return savePromiseRef.current;
    }, [isAuthenticated, token, getHeaders, ensureCollectionExists, key]);

    flushRef.current = flush;
    return [value, updateValue, loading, flush] as const;
}
