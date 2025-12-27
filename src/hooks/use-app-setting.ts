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

    const getHeaders = useCallback((): Record<string, string> => {
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, [token]);

    // Helper: Find existing setting ID by key
    const fetchRemoteId = useCallback(async () => {
        if (!token) return null;
        try {
            console.log(`[useAppSetting] Fetching ID for key: ${key}`);
            const response = await apiRequest('nocobase', '/pkm_settings', {
                headers: getHeaders(),
                params: {
                    filter: JSON.stringify({ key: { $eq: key } }),
                    pageSize: '1',
                }
            });
            console.log(`[useAppSetting] Fetch Response for ${key}:`, response);

            const data = response?.data || [];
            if (data.length > 0) {
                console.log(`[useAppSetting] Inspecting record 0 for ${key}:`, JSON.stringify(data[0]));
                if (data[0].id) {
                    console.log(`[useAppSetting] Recovered ID for ${key}:`, data[0].id);
                    return data[0].id; // Return the ID
                } else {
                    console.warn(`[useAppSetting] Record found but 'id' is missing? Keys:`, Object.keys(data[0]));
                }
            } else {
                console.warn(`[useAppSetting] Fetch successful but no existing record found for ${key} (Length: ${data.length})`);
            }
        } catch (e) {
            console.warn(`[useAppSetting] Failed to recover ID for ${key}`, e);
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
        // Double-check localStorage as well to avoid stale closures
        if (!isAuthenticated || !token || !localStorage.getItem('nocobase_token')) return;
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
                // Double-check localStorage as well to avoid stale closures
                if (!isAuthenticated || !token || !localStorage.getItem('nocobase_token')) return;

                const headers = getHeaders();

                const performSave = async (valueToSave: any, retryCount = 0): Promise<void> => {
                    console.log(`[useAppSetting] Saving ${key}...`, { hasId: !!settingIdRef.current, retryCount });
                    try {
                        // Strategy: Always try to use ID if we have it
                        if (settingIdRef.current) {
                            console.log(`[useAppSetting] Updating existing setting ${key} (ID: ${settingIdRef.current})`);
                            await apiRequest('nocobase', `/pkm_settings/${settingIdRef.current}`, {
                                method: 'PUT',
                                headers,
                                data: { value: valueToSave }
                            });
                            console.log(`[useAppSetting] Update success for ${key}`);
                            return;
                        }

                        // No ID, try CREATE (POST)
                        console.log(`[useAppSetting] Creating new setting ${key}`);
                        const response = await apiRequest('nocobase', '/pkm_settings', {
                            method: 'POST',
                            headers,
                            data: { key, value: valueToSave }
                        });
                        if (response?.data?.id) {
                            settingIdRef.current = response.data.id;
                            console.log(`[useAppSetting] Create success for ${key}, assigned ID: ${settingIdRef.current}`);
                        }
                        return;
                    } catch (err: any) {
                        const errMsg = (err.message || JSON.stringify(err)).toLowerCase();
                        console.warn(`[useAppSetting] Save error for ${key}:`, errMsg);

                        // Case 1: Key already exists (400) -> We need to fetch ID and update instead
                        if (errMsg.includes('exists') || errMsg.includes('unique')) {
                            console.log(`[useAppSetting] Key exists collision. Attempting recovery...`);
                            const foundId = await fetchRemoteId();
                            if (foundId) {
                                settingIdRef.current = foundId;
                                if (retryCount < 1) return performSave(valueToSave, retryCount + 1);
                            }
                        }

                        // Case 2: Collection not found (404) -> Create collection and retry
                        if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('relation "pkm_settings" does not exist')) {
                            if (retryCount < 1) { // Only try creating collection once
                                console.log(`[useAppSetting] Collection missing. Creating...`);
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

    // Immediate flush function (returns a promise) to persist current value to backend
    const flush = useCallback(async (valueToSave?: T) => {
        if (!isAuthenticated || !token || !localStorage.getItem('nocobase_token')) {
            console.warn("[useAppSetting] Flush skipped - no auth");
            return;
        }
        const headers = getHeaders();
        const toSave = valueToSave === undefined ? valueRef.current : valueToSave;

        const attemptUpsert = async (attempt = 1): Promise<void> => {
            console.log(`[useAppSetting] Flush: Saving ${key} (Attempt ${attempt})`, { hasId: !!settingIdRef.current });

            try {
                // Try update by known ID
                if (settingIdRef.current) {
                    console.log(`[useAppSetting] Flush: Updating existing ${key} (ID: ${settingIdRef.current})`);
                    await apiRequest('nocobase', `/pkm_settings/${settingIdRef.current}`, {
                        method: 'PUT',
                        headers,
                        data: { value: toSave }
                    });
                    console.log(`[useAppSetting] Flush: Update success for ${key}`);
                    return;
                }

                // Try create
                console.log(`[useAppSetting] Flush: Creating new ${key}`);
                const response = await apiRequest('nocobase', '/pkm_settings', {
                    method: 'POST',
                    headers,
                    data: { key, value: toSave }
                });
                if (response?.data?.id) {
                    settingIdRef.current = response.data.id;
                    console.log(`[useAppSetting] Flush: Create success, ID assigned: ${settingIdRef.current}`);
                }
                return;
            } catch (err: any) {
                const errMsg = (err.message || JSON.stringify(err)).toLowerCase();
                console.warn(`[useAppSetting] Flush error for ${key}:`, errMsg);

                // 400 conflict -> fetch id and update
                if (attempt < 2 && (errMsg.includes('exists') || errMsg.includes('unique') || errMsg.includes('400'))) {
                    console.log(`[useAppSetting] Flush: Collision detected. Recovering ID...`);
                    const found = await fetchRemoteId();
                    if (found) {
                        settingIdRef.current = found;
                        console.log(`[useAppSetting] Flush: ID Recovered ${found}. Retrying...`);
                        return await attemptUpsert(attempt + 1);
                    } else {
                        console.error(`[useAppSetting] Flush: Failed to recover ID for ${key}`);
                    }
                }

                // 404 / missing collection -> create and retry
                if (attempt < 2 && (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('collection'))) {
                    console.log(`[useAppSetting] Flush: Collection missing. creating...`);
                    const ok = await ensureCollectionExists();
                    if (ok) return attemptUpsert(attempt + 1);
                }

                throw err;
            }
        };

        // Serialize flushes
        savePromiseRef.current = (savePromiseRef.current || Promise.resolve()).then(() => attemptUpsert()).catch(e => {
            console.error('[useAppSetting] Flush chain failed:', e);
            // We don't rethrow here to prevent unhandled rejection crashes, but we rely on toast in caller
            throw e;
        });
        return savePromiseRef.current;
    }, [isAuthenticated, token, getHeaders, fetchRemoteId, ensureCollectionExists, key]);

    // Save flush function in ref for external use if needed
    flushRef.current = flush;

    return [value, updateValue, loading, flush] as const;
}
