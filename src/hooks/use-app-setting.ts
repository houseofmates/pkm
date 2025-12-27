
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api-client';
import { toast } from 'sonner';

export interface AppSetting {
    id?: number | string;
    key: string;
    value: any;
}

export function useAppSetting<T>(key: string, defaultValue: T) {
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

    const [loading, setLoading] = useState(false);
    const settingIdRef = useRef<string | number | null>(null);
    const isFirstLoad = useRef(true);

    const getHeaders = useCallback(() => {
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, [token]);

    // Helper: extract list data from various shapes returned by the API
    const extractList = (resp: any) => {
        if (!resp) return [];
        if (Array.isArray(resp)) return resp;
        if (Array.isArray(resp.data)) return resp.data;
        if (resp?.data?.data && Array.isArray(resp.data.data)) return resp.data.data;
        return [];
    };

    // Fetch from Backend
    const fetchSetting = useCallback(async () => {
        if (!isAuthenticated || !token) return;
        setLoading(true);
        try {
            // Filter by key
            const response = await apiRequest('nocobase', '/pkm_settings', {
                headers: getHeaders(),
                params: {
                    filter: JSON.stringify({ key }),
                    pageSize: '1',
                }
            });

            const data = extractList(response);
            if (data.length > 0) {
                const setting = data[0];
                settingIdRef.current = setting.id;

                // Backend wins if exists
                if (setting.value !== undefined) {
                    setValue(setting.value);
                    // Update local cache
                    localStorage.setItem(`pkm_setting:${key}`, JSON.stringify(setting.value));
                }
            }
        } catch (err: any) {
            console.error(`Failed to fetch setting ${key}:`, err);
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
    const saveTimeoutRef = useRef<any>(null);
    // Serialize saves to avoid internal race conditions
    const lastSavePromiseRef = useRef<Promise<any> | null>(null);

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

                // Serialize saves so multiple quick changes don't race internally
                if (!lastSavePromiseRef.current) lastSavePromiseRef.current = Promise.resolve();

                // Append this save to the promise chain
                lastSavePromiseRef.current = lastSavePromiseRef.current.then(async () => {
                    // Try up to two attempts (create -> conflict -> fetch+update) and handle missing collection
                    const attemptUpsert = async (attempt = 1): Promise<void> => {
                        // First, try to find existing setting id (best-effort)
                        try {
                            if (!settingIdRef.current) {
                                const getRes = await apiRequest('nocobase', '/pkm_settings', {
                                    headers,
                                    params: { filter: JSON.stringify({ key }), pageSize: '1' }
                                });
                                const list = extractList(getRes);
                                if (list.length > 0) {
                                    settingIdRef.current = list[0].id;
                                }
                            }
                        } catch (e) {
                            // ignore, we'll handle on create/update
                        }

                        // If we have an ID, update
                        if (settingIdRef.current) {
                            await apiRequest('nocobase', `/pkm_settings/${settingIdRef.current}`, {
                                method: 'PUT',
                                headers,
                                data: { value: resolvedValue }
                            });
                            return;
                        }

                        // Otherwise try to create
                        try {
                            const response = await apiRequest('nocobase', '/pkm_settings', {
                                method: 'POST',
                                headers,
                                data: { key, value: resolvedValue }
                            });
                            const created = (response && (response.data || response)) as any;
                            // Depending on API shape, id may be at response.data.id or response.id
                            settingIdRef.current = created?.id || created?.data?.id || settingIdRef.current;
                            return;
                        } catch (err: any) {
                            // Detect structured status if available
                            const status = err?.status;
                            const dataString = JSON.stringify(err?.data || err?.message || err);

                            // 400 conflict => key exists. Refresh and update
                            if (status === 400 || /key\s+already\s+exists/i.test(dataString) || /already\s+exists/i.test(dataString)) {
                                try {
                                    const getRes = await apiRequest('nocobase', '/pkm_settings', {
                                        headers,
                                        params: { filter: JSON.stringify({ key }), pageSize: '1' }
                                    });
                                    const list = extractList(getRes);
                                    if (list.length > 0) {
                                        settingIdRef.current = list[0].id;
                                        // Now update
                                        await apiRequest('nocobase', `/pkm_settings/${settingIdRef.current}`, {
                                            method: 'PUT',
                                            headers,
                                            data: { value: resolvedValue }
                                        });
                                        return;
                                    }
                                } catch (inner) {
                                    // fall through to error handling below
                                }
                            }

                            // 404 / collection missing -> create collection and retry once
                            if (status === 404 || /not\s*found|collection/i.test(dataString)) {
                                if (attempt === 1) {
                                    try {
                                        console.log("Attempting to create pkm_settings collection...");
                                        await apiRequest('nocobase', '/collections', {
                                            method: 'POST',
                                            headers,
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
                                        // Small delay for backend to initialize
                                        await new Promise(r => setTimeout(r, 1000));
                                        // Retry the upsert once
                                        return attemptUpsert(attempt + 1);
                                    } catch (createErr: any) {
                                        console.error("Failed to create pkm_settings:", createErr);
                                        throw createErr;
                                    }
                                }
                            }

                            // Propagate unknown error
                            throw err;
                        }
                    };

                    try {
                        await attemptUpsert();
                        console.log(`Saved setting ${key} to backend`);
                    } catch (err: any) {
                        console.error(`Failed to save setting ${key}:`, err);
                        const msg = err?.message || JSON.stringify(err);
                        toast.error(`Sync failed: ${msg}`);
                    }
                }).catch((chainErr) => {
                    // ensure unhandled rejections in chain are logged
                    console.error('Save chain error:', chainErr);
                });

            }, 1000); // 1s debounce

            return resolvedValue;
        });
    }, [key, isAuthenticated, token, getHeaders]);

    return [value, updateValue, loading] as const;
}
