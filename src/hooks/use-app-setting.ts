
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

            const data = response?.data || [];
            if (data.length > 0) {
                const setting = data[0];
                settingIdRef.current = setting.id;

                // Merge strategies could go here, for now backend wins if exists
                if (setting.value) {
                    setValue(setting.value);
                    // Update local cache
                    localStorage.setItem(`pkm_setting:${key}`, JSON.stringify(setting.value));
                }
            }
        } catch (err) {
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

    const updateValue = useCallback((newValue: T | ((val: T) => T)) => {
        setValue((prev) => {
            const resolvedValue = newValue instanceof Function ? newValue(prev) : newValue;

            // 1. Update Local Storage Immediately
            localStorage.setItem(`pkm_setting:${key}`, JSON.stringify(resolvedValue));

            // 2. Debounce Save to Backend
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

            saveTimeoutRef.current = setTimeout(async () => {
                if (!isAuthenticated || !token) return;

                const headers = { Authorization: `Bearer ${token}` };

                const saveToBackend = async () => {
                    // 1. Ensure we have an ID. If not, try to fetch it first.
                    if (!settingIdRef.current) {
                        try {
                            const getRes = await apiRequest('nocobase', '/pkm_settings', {
                                headers,
                                params: { filter: JSON.stringify({ key }), pageSize: '1' }
                            });
                            if (getRes?.data?.[0]?.id) {
                                settingIdRef.current = getRes.data[0].id;
                            }
                        } catch (e) {
                            // Ignore fetch error, will try create/handle below
                        }
                    }

                    // 2. Perform Update or Create
                    if (settingIdRef.current) {
                        await apiRequest('nocobase', `/pkm_settings/${settingIdRef.current}`, {
                            method: 'PUT',
                            headers,
                            data: { value: resolvedValue }
                        });
                    } else {
                        const response = await apiRequest('nocobase', '/pkm_settings', {
                            method: 'POST',
                            headers,
                            data: { key, value: resolvedValue }
                        });
                        if (response?.data?.id) {
                            settingIdRef.current = response.data.id;
                        }
                    }
                };

                try {
                    await saveToBackend();
                    console.log(`Saved setting ${key} to backend`);
                } catch (err: any) {
                    console.error(`Failed to save setting ${key}:`, err);
                    const errorMessage = err.message || JSON.stringify(err);

                    // Auto-healing: Create collection ONLY if missing (404)
                    // If it was a 400 (Key exists), the logic above should have caught it (by fetching ID).
                    // So if we are here with 400, something else is wrong, but we mostly care about 404 for auto-init.
                    if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('collection')) {
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
                            await new Promise(r => setTimeout(r, 1000));
                            await saveToBackend();
                            toast.success("Settings synced (initialized storage)");
                        } catch (createErr: any) {
                            console.error("Failed to create pkm_settings:", createErr);
                            toast.error(`Sync failed: ${createErr.message || "Could not init storage"}`);
                        }
                    } else {
                        toast.error(`Sync failed: ${errorMessage}`);
                    }
                }
            }, 1000); // 1s debounce

            return resolvedValue;
        });
    }, [key, isAuthenticated, token]);

    return [value, updateValue, loading] as const;
}
