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



    // ensureCollectionExists removed - handled by NocoBaseClient.ensureBackendCollection
    // which is called by AuthProvider on login.

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
                        try {
                            localStorage.setItem(`pkm_setting:${key}`, newValueString);
                        } catch (e) {
                            console.warn(`Failed to update local cache for ${key}`, e);
                        }
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

    // Event Bus Listener for Cross-Component Sync
    useEffect(() => {
        const handler = (e: CustomEvent) => {
            const newValue = e.detail;
            setValue(prev => {
                // Prevent loops/unnecessary renders
                if (JSON.stringify(prev) === JSON.stringify(newValue)) return prev;
                return newValue;
            });
        };
        window.addEventListener(`pkm_setting_update:${key}`, handler as any);
        return () => window.removeEventListener(`pkm_setting_update:${key}`, handler as any);
    }, [key]);

    // Save to Backend (Debounced)
    const updateValue = useCallback((newValue: T | ((val: T) => T)) => {
        setValue((prev) => {
            const resolvedValue = newValue instanceof Function ? newValue(prev) : newValue;
            try {
                localStorage.setItem(`pkm_setting:${key}`, JSON.stringify(resolvedValue));
                // Broadcast change to other hooks
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent(`pkm_setting_update:${key}`, { detail: resolvedValue }));
                }, 0);
            } catch (e) {
                // Ignore QuotaExceededError - just don't cache locally, rely on server
                console.warn(`Failed to save locally for ${key}`, e);
            }

            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(async () => {
                if (!isAuthenticated || !token || !localStorage.getItem('nocobase_token')) return;
                const performSave = async (valueToSave: any): Promise<void> => {
                    try {
                        const payload = { value: valueToSave };

                        // Try UPDATE first
                        try {
                            const res = await client.request('pkm_settings', 'update', {
                                method: 'POST',
                                params: { filter: { key: { $eq: key } } },
                                data: payload,
                                silent: true
                            });

                            const updated = Array.isArray(res?.data) ? res.data : (res?.data ? [res.data] : []);
                            if (updated.length > 0) {
                                settingIdRef.current = updated[0].id;
                                return;
                            }
                        } catch (e) { /* ignore update failure, try create */ }

                        // If update didn't work, CREATE
                        const createRes = await client.request('pkm_settings', 'create', {
                            method: 'POST',
                            data: { key, value: valueToSave },
                            silent: true
                        });
                        if (createRes?.data?.id) {
                            settingIdRef.current = createRes.data.id;
                        }

                    } catch (err: any) {
                        const errMsg = (err.message || "").toLowerCase();
                        if (errMsg.includes('404') || errMsg.includes('not found')) {
                            console.warn("PKM Setting save failed: Collection not ready.", errMsg);
                            // Initial ensureBackendCollection should handle this; we just fail silently here to avoid loops
                        }
                    }
                };

                savePromiseRef.current = (savePromiseRef.current || Promise.resolve()).then(() => performSave(resolvedValue)).catch(() => { });
            }, debounceMs);

            return resolvedValue;
        });
    }, [key, isAuthenticated, token, client, debounceMs]);

    const flush = useCallback(async (valueToSave?: T) => {
        if (!isAuthenticated || !token || !localStorage.getItem('nocobase_token')) return;
        const toSave = valueToSave === undefined ? valueRef.current : valueToSave;

        const attemptUpsert = async (attempt = 1): Promise<void> => {
            try {
                const payload = { value: toSave };
                // Update First
                try {
                    const res = await client.request('pkm_settings', 'update', {
                        method: 'POST',
                        params: { filter: { key: { $eq: key } } },
                        data: payload,
                        silent: true
                    });
                    const updated = Array.isArray(res?.data) ? res.data : (res?.data ? [res.data] : []);
                    if (updated.length > 0) {
                        settingIdRef.current = updated[0].id;
                        return;
                    }
                } catch (e) {/* try create */ }

                // Create
                const createRes = await client.request('pkm_settings', 'create', {
                    method: 'POST',
                    data: { key, value: toSave },
                    silent: true
                });
                if (createRes?.data?.id) settingIdRef.current = createRes.data.id;

            } catch (err: any) {
                const errMsg = (err.message || "").toLowerCase();
                if (attempt < 2 && (errMsg.includes('404') || errMsg.includes('not found'))) {
                    // Retry once for network blips
                    return attemptUpsert(attempt + 1);
                }
                throw err;
            }
        };

        const p = (savePromiseRef.current || Promise.resolve()).then(() => attemptUpsert()).catch(() => { });
        savePromiseRef.current = p as Promise<void>;
        return p;
    }, [isAuthenticated, token, client, key]);

    flushRef.current = () => flush();
    return [value, updateValue, loading, flush] as const;
}
