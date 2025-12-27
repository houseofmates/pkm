
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
    const { isAuthenticated } = useAuth();
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

    // Fetch from Backend
    const fetchSetting = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            // Filter by key
            const response = await apiRequest('nocobase', '/pkm_settings', {
                params: {
                    filter: { key },
                    pageSize: 1,
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
    }, [key, isAuthenticated]);

    // Initial Load
    useEffect(() => {
        fetchSetting();
    }, [fetchSetting]);

    // Save to Backend (Debounced)
    const saveTimeoutRef = useRef<NodeJS.Timeout>();

    const updateValue = useCallback((newValue: T | ((val: T) => T)) => {
        setValue((prev) => {
            const resolvedValue = newValue instanceof Function ? newValue(prev) : newValue;

            // 1. Update Local Storage Immediately
            localStorage.setItem(`pkm_setting:${key}`, JSON.stringify(resolvedValue));

            // 2. Debounce Save to Backend
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

            saveTimeoutRef.current = setTimeout(async () => {
                if (!isAuthenticated) return;

                const saveToBackend = async () => {
                    if (settingIdRef.current) {
                        await apiRequest('nocobase', `/pkm_settings/${settingIdRef.current}`, {
                            method: 'PUT',
                            data: { value: resolvedValue }
                        });
                    } else {
                        const response = await apiRequest('nocobase', '/pkm_settings', {
                            method: 'POST',
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

                    // Auto-healing: Create collection if missing (404 or similar)
                    // NocoBase returns 404 for missing collection
                    if (err.response?.status === 404 || err.message?.includes('not found')) {
                        try {
                            console.log("Attempting to create pkm_settings collection...");
                            // Create Collection
                            await apiRequest('nocobase', '/collections', {
                                method: 'POST',
                                data: {
                                    name: 'pkm_settings',
                                    title: 'PKM Settings',
                                    fields: [
                                        { name: 'key', type: 'string', unique: true },
                                        { name: 'value', type: 'json' }
                                    ]
                                }
                            });
                            // Retry save
                            await saveToBackend();
                            toast.success("Settings synced (initialized storage)");
                        } catch (createErr) {
                            console.error("Failed to create pkm_settings:", createErr);
                            toast.error('Failed to sync settings to cloud');
                        }
                    } else {
                        toast.error('Failed to sync settings to cloud');
                    }
                }
            }, 1000); // 1s debounce

            return resolvedValue;
        });
    }, [key, isAuthenticated]);

    return [value, updateValue, loading] as const;
}
