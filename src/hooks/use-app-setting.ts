
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

                try {
                    if (settingIdRef.current) {
                        // Update
                        await apiRequest('nocobase', `/pkm_settings/${settingIdRef.current}`, {
                            method: 'PUT',
                            data: { value: resolvedValue }
                        });
                    } else {
                        // Create
                        // Double check it didn't get created in the meantime?
                        // For simplicity, just try create.
                        const response = await apiRequest('nocobase', '/pkm_settings', {
                            method: 'POST',
                            data: { key, value: resolvedValue }
                        });
                        if (response?.data?.id) {
                            settingIdRef.current = response.data.id;
                        }
                    }
                    console.log(`Saved setting ${key} to backend`);
                } catch (err) {
                    console.error(`Failed to save setting ${key}:`, err);
                    toast.error('Failed to sync settings to cloud');
                }
            }, 1000); // 1s debounce

            return resolvedValue;
        });
    }, [key, isAuthenticated]);

    return [value, updateValue, loading] as const;
}
