import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';

export interface AppSetting {
    id?: number | string;
    key: string;
    value: any;
}

export function useAppSetting<T>(key: string, defaultValue: T, options?: { debounceMs?: number }) {
    const debounceMs = options?.debounceMs ?? 1000;

    // Expose a way to flush pending saves immediately (useful when you need cross-device persistence)
    const flushRef = useRef<() => Promise<void> | null>(null);
    const { isAuthenticated, token, client } = useAuth();

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



    const ensureCollectionExists = useCallback(async () => {
        try {
            await client.createCollection({
                name: 'pkm_settings',
                title: 'PKM Settings',
                fields: [
                    { name: 'key', type: 'string', unique: true },
                    { name: 'value', type: 'json' }
                ],
                hidden: true
            });
            // Wait a moment for propagation
            await new Promise(r => setTimeout(r, 1000));
            return true;
        } catch (err: any) {
            // If it already exists, that's fine too
            if (err.message?.includes('exists')) return true;
            return false;
        }
    }, [client]);

    // Fetch from Backend on mount
    const fetchSetting = useCallback(async () => {
        if (!isAuthenticated || !token || !localStorage.getItem('nocobase_token')) return;
        setLoading(true);
        try {
            // Use :list instead of :get for filtering by key
            const response = await client.request('pkm_settings', 'list', {
                params: {
                    filter: { key: { $eq: key } },
                    pageSize: '1'
                },
                silent: true
            });

            // NocoBase :list returns { data: [...] }
            const data = response?.data || (Array.isArray(response) ? response : []);
            if (data.length > 0) {
                const setting = data[0];
                settingIdRef.current = setting.id;

                if (setting.value !== undefined) {
                    // Deep compare to avoid redundant re-renders
                    const newValueString = JSON.stringify(setting.value);
                    const localValueString = localStorage.getItem(`pkm_setting:${key}`);

                    if (newValueString !== localValueString) {
                        setValue(setting.value);
                        localStorage.setItem(`pkm_setting:${key}`, newValueString);
                    }
                }
            }
        } catch (err: any) {
            const msg = err.message || '';
            if (!msg.includes('404') && !msg.includes('400')) {
                // Ignore silent errors for existence checks
            }
        } finally {
            setLoading(false);
        }
    }, [key, isAuthenticated, token, client]);

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
                const performSave = async (valueToSave: any, retryCount = 0): Promise<void> => {
                    try {
                        // Update-First Strategy: Attempt to update via filter first.
                        // NocoBase :update with filter returns [] if nothing found, NO error.
                        const updateRes = await client.request('pkm_settings', 'update', {
                            method: 'POST',
                            params: { filter: { key: { $eq: key } } },
                            data: { value: valueToSave },
                            silent: true
                        });

                        const updatedRecords = updateRes?.data || (Array.isArray(updateRes) ? updateRes : []);

                        if (updatedRecords.length > 0) {
                            // Successfully updated!
                            settingIdRef.current = updatedRecords[0].id;
                        } else {
                            // Nothing updated, so it likely doesn't exist. Now safe to create.
                            try {
                                const response = await client.request('pkm_settings', 'create', {
                                    method: 'POST',
                                    data: { key, value: valueToSave },
                                    silent: true
                                });
                                if (response?.data?.id) {
                                    settingIdRef.current = response.data.id;
                                }
                            } catch (createErr: any) {
                                // Double-catch for safety
                                const isConflict = createErr.status === 400 || (createErr.message || '').includes('exists');
                                if (isConflict) {
                                    await client.request('pkm_settings', 'update', {
                                        method: 'POST',
                                        params: { filter: { key: { $eq: key } } },
                                        data: { value: valueToSave },
                                        silent: true
                                    });
                                } else {
                                    throw createErr;
                                }
                            }
                        }
                    } catch (err: any) {
                        const errMsg = (err.message || JSON.stringify(err)).toLowerCase();
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
    }, [key, isAuthenticated, token, client, ensureCollectionExists, debounceMs]);

    const flush = useCallback(async (valueToSave?: T) => {
        if (!isAuthenticated || !token || !localStorage.getItem('nocobase_token')) return;
        const toSave = valueToSave === undefined ? valueRef.current : valueToSave;

        const attemptUpsert = async (attempt = 1): Promise<void> => {
            try {
                // Update-First Strategy for Flush
                const updateRes = await client.request('pkm_settings', 'update', {
                    method: 'POST',
                    params: { filter: { key: { $eq: key } } },
                    data: { value: toSave },
                    silent: true
                });

                const updatedRecords = updateRes?.data || (Array.isArray(updateRes) ? updateRes : []);

                if (updatedRecords.length > 0) {
                    settingIdRef.current = updatedRecords[0].id;
                } else {
                    try {
                        const response = await client.request('pkm_settings', 'create', {
                            method: 'POST',
                            data: { key, value: toSave },
                            silent: true
                        });
                        if (response?.data?.id) settingIdRef.current = response.data.id;
                    } catch (createErr: any) {
                        const isConflict = createErr.status === 400 || (createErr.message || '').includes('exists');
                        if (isConflict) {
                            await client.request('pkm_settings', 'update', {
                                method: 'POST',
                                params: { filter: { key: { $eq: key } } },
                                data: { value: toSave },
                                silent: true
                            });
                        } else {
                            throw createErr;
                        }
                    }
                }
            } catch (err: any) {
                const errMsg = (err.message || JSON.stringify(err)).toLowerCase();

                if (attempt < 2 && (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('collection'))) {
                    const ok = await ensureCollectionExists();
                    if (ok) return attemptUpsert(attempt + 1);
                }
                throw err;
            }
        };

        const p = (savePromiseRef.current || Promise.resolve()).then(() => attemptUpsert()).catch(() => { });
        savePromiseRef.current = p as Promise<void>;
        return p;
    }, [isAuthenticated, token, client, ensureCollectionExists, key]);

    flushRef.current = () => flush();
    return [value, updateValue, loading, flush] as const;
}
