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
    const isFirstLoad = useRef(true);
    const saveTimeoutRef = useRef<any>(null);

    const getHeaders = useCallback(() => {
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, [token]);

    // Helper: Find existing setting ID by key
    const fetchRemoteId = useCallback(async () => {
        if (!token) return null;
        try {
            const response = await apiRequest('nocobase', '/pkm_settings', {
                headers: getHeaders(),
                params: {
                    filter: JSON.stringify({ key }),
                    pageSize: '1',
                    fields: 'id,value' // Optimisation
                }
            });
            const data = response?.data || [];
            if (data.length > 0) {
                return data[0].id;
            }
        } catch (e) {
            // Ignore fetch error
        }
        return null;
    }, [key, token, getHeaders]);

    // Helper: Create the collection if missing
    const ensureCollectionExists = useCallback(async () => {
        console.log("Attempting to create pkm_settings collection...");
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
            console.error("Failed to create pkm_settings:", err);
            return false;
        }
    }, [getHeaders]);

    // Fetch from Backend on mount
    const fetchSetting = useCallback(async () => {
        if (!isAuthenticated || !token) return;
        setLoading(true);
        try {
            const response = await apiRequest('nocobase', '/pkm_settings', {
                headers: getHeaders(),
                params: {
                    filter: JSON.stringify({ key }),
                    pageSize: '1',
                }
            });

            const data = response?.data || [];
            if (data.length > 0) {
                const setting = data[0];
                settingIdRef.current = setting.id;

                // Backend wins on initial load
                if (setting.value !== undefined) {
                    setValue(setting.value);
                    localStorage.setItem(`pkm_setting:${key}`, JSON.stringify(setting.value));
                }
            }
        } catch (err: any) {
            const msg = err.message || '';
            // If collection missing (404), likely first run, ignore.
            if (!msg.includes('404')) {
                console.error(`Failed to fetch setting ${key}:`, err);
            }
        } finally {
            setLoading(false);
            isFirstLoad.current = false;
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

            // 1. Update Local Storage Immediately
            localStorage.setItem(`pkm_setting:${key}`, JSON.stringify(resolvedValue));

            // 2. Debounce Save to Backend
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

            saveTimeoutRef.current = setTimeout(async () => {
                if (!isAuthenticated || !token) return;

                const headers = getHeaders();

                const performSave = async (valueToSave: any, retryCount = 0): Promise<void> => {
                    try {
                        // Strategy: Always try to use ID if we have it
                        if (settingIdRef.current) {
                            await apiRequest('nocobase', `/pkm_settings/${settingIdRef.current}`, {
                                method: 'PUT',
                                headers,
                                data: { value: valueToSave }
                            });
                            return;
                        }

                        // No ID, try CREATE (POST)
                        const response = await apiRequest('nocobase', '/pkm_settings', {
                            method: 'POST',
                            headers,
                            data: { key, value: valueToSave }
                        });
                        if (response?.data?.id) {
                            settingIdRef.current = response.data.id;
                        }
                        return;
                    } catch (err: any) {
                        const errMsg = (err.message || JSON.stringify(err)).toLowerCase();

                        // Case 1: Key already exists (400) -> We need to fetch ID and update instead
                        if (errMsg.includes('exists') || errMsg.includes('unique')) {
                            const foundId = await fetchRemoteId();
                            if (foundId) {
                                settingIdRef.current = foundId;
                                if (retryCount < 1) return performSave(valueToSave, retryCount + 1);
                            }
                        }

                        // Case 2: Collection not found (404) -> Create collection and retry
                        if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('relation "pkm_settings" does not exist')) {
                            if (retryCount < 1) { // Only try creating collection once
                                const created = await ensureCollectionExists();
                                if (created) return performSave(valueToSave, retryCount + 1);
                            }
                        }

                        // Only log real errors (skip 404s if we handled them)
                        console.error(`Failed to save setting ${key} (attempt ${retryCount}):`, err);
                        throw err;
                    }
                };

                // Chain into serial promise to avoid races between multiple debounced saves or flushes
                savePromiseRef.current = (savePromiseRef.current || Promise.resolve()).then(() => performSave(resolvedValue)).catch(e => { console.error('save chain error', e); });

            }, debounceMs); // configurable debounce

            return resolvedValue;
        });
    }, [key, isAuthenticated, token, getHeaders, fetchRemoteId, ensureCollectionExists]);

    return [value, updateValue, loading] as const;
}
