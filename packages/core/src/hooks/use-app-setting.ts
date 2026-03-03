import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';

export interface AppSetting {
  id?: number | string;
  key: string;
  value: unknown;
}

export function useAppSetting<T>(key: string, defaultValue: T, options?: { debounceMs?: number; pollIntervalMs?: number }) {
  const debounceMs = options?.debounceMs ?? 1000;
  const pollIntervalMs = options?.pollIntervalMs;

  // expose a way to flush pending saves immediately (useful when you need cross-device persistence)
  const flushRef = useRef<() => Promise<void> | null>(null);
  const { isAuthenticated, token, client } = useAuth();

  // initialize from localstorage for immediate availability
  const [value, setValue] = useState<T>(() => {
    try {
      const local = storageManager.getItem(`pkm_setting:${key}`);
      return local ? JSON.parse(local) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  });

  // keep a ref to latest value for flush to read
  const valueRef = useRef<T>(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  // serialize immediate saves
  const savePromiseRef = useRef<Promise<void> | null>(null);

  const [loading, setLoading] = useState(false);
  const settingIdRef = useRef<string | number | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // fetch from backend on mount
  const fetchSetting = useCallback(async () => {
    if (!isAuthenticated || !token || !storageManager.getItem('nocobase_token')) return;
    setLoading(true);
    try {
      // use :list instead of :get for filtering by key
      const response = await client.request('pkm_settings', 'list', {
        params: {
          filter: { key: { $eq: key } },
          pageSize: '1'
        },
        silent: true
      });

      // nocobase :list returns { data: [...] }
      const data = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray(response)
          ? response
          : [];
      if (data.length > 0) {
        const setting = data[0];
        settingIdRef.current = setting.id;

        if (setting.value !== undefined) {
          // deep compare to avoid redundant re-renders
          const newValueString = JSON.stringify(setting.value);
          const localValueString = storageManager.getItem(`pkm_setting:${key}`);

          if (newValueString !== localValueString) {
            setValue(setting.value);
            try {
              storageManager.setItem(`pkm_setting:${key}`, newValueString);
              // broadcast change to other hooks in the same window
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent(`pkm_setting_update:${key}`, { detail: setting.value }));
              }, 0);
            } catch (e) {
              secureLogger.warn(`Failed to update local cache for ${key}`, e);
            }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('404') && !msg.includes('400')) {
        // ignore silent errors for existence checks
      }
    } finally {
      setLoading(false);
    }
  }, [key, isAuthenticated, token, client]);

  // initial load
  useEffect(() => {
    fetchSetting();
  }, [fetchSetting]);

  // optional polling interval sync across devices
  useEffect(() => {
    if (!pollIntervalMs) return;
    const interval = setInterval(fetchSetting, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchSetting, pollIntervalMs]);

  // event bus listener for cross-component sync
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const newValue = e.detail;
      setValue(prev => {
        // prevent loops/unnecessary renders
        if (JSON.stringify(prev) === JSON.stringify(newValue)) return prev;
        return newValue;
      });
    };
    window.addEventListener(`pkm_setting_update:${key}`, handler as EventListener);
    return () => window.removeEventListener(`pkm_setting_update:${key}`, handler as EventListener);
  }, [key]);

  // save to backend (debounced)
  const updateValue = useCallback((newValue: T | ((val: T) => T)) => {
    setValue((prev) => {
      const resolvedValue = newValue instanceof Function ? newValue(prev) : newValue;
      try {
        storageManager.setItem(`pkm_setting:${key}`, JSON.stringify(resolvedValue));
        // broadcast change to other hooks
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent(`pkm_setting_update:${key}`, { detail: resolvedValue }));
        }, 0);
      } catch (e) {
        // ignore quotaexceedederror - just don't cache locally, rely on server
        secureLogger.warn(`Failed to save locally for ${key}`, e);
      }

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        if (!isAuthenticated || !token || !storageManager.getItem('nocobase_token')) return;
        const performSave = async (valueToSave: unknown): Promise<void> => {
          try {
            const payload = { value: valueToSave };

            // try update first
            try {
              const res = await client.request('pkm_settings', 'update', {
                method: 'POST',
                params: settingIdRef.current ? { filterByTk: settingIdRef.current } : { filter: { key: { $eq: key } } },
                data: payload,
                silent: true
              });

              const updated = Array.isArray(res?.data) ? res.data : (res?.data ? [res.data] : []);
              if (updated.length > 0) {
                settingIdRef.current = updated[0].id;
                return;
              }
            } catch (e) { /* ignore update failure, try create */ }

            // if update didn't work, create
            const createRes = await client.request('pkm_settings', 'create', {
              method: 'POST',
              data: { key, value: valueToSave },
              silent: true
            }) as { data?: { id?: string | number } };
            if (createRes?.data?.id) {
              settingIdRef.current = createRes.data.id;
            }

          } catch (err: unknown) {
            const errMsg = (err instanceof Error ? err.message : "").toLowerCase();
            if (errMsg.includes('404') || errMsg.includes('not found')) {
              secureLogger.warn("PKM Setting save failed: Collection not ready.", errMsg);
              // initial ensurebackendcollection should handle this; we just fail silently here to avoid loops
            }
          }
        };

        savePromiseRef.current = (savePromiseRef.current || Promise.resolve()).then(() => performSave(resolvedValue)).catch(() => { });
      }, debounceMs);

      return resolvedValue;
    });
  }, [key, isAuthenticated, token, client, debounceMs]);

  const flush = useCallback(async (valueToSave?: T) => {
    if (!isAuthenticated || !token || !storageManager.getItem('nocobase_token')) return;
    const toSave = valueToSave === undefined ? valueRef.current : valueToSave;

    const attemptUpsert = async (attempt = 1): Promise<void> => {
      try {
        const payload = { value: toSave };
        // update first
        try {
          const res = await client.request('pkm_settings', 'update', {
            method: 'POST',
            params: settingIdRef.current ? { filterByTk: settingIdRef.current } : { filter: { key: { $eq: key } } },
            data: payload,
            silent: true
          });
          const updated = Array.isArray(res?.data) ? res.data : (res?.data ? [res.data] : []);
          if (updated.length > 0) {
            settingIdRef.current = updated[0].id;
            return;
          }
        } catch (e) {/* try create */ }

        // create
        const createRes = await client.request('pkm_settings', 'create', {
          method: 'POST',
          data: { key, value: toSave },
          silent: true
        }) as { data?: { id?: string | number } };
        if (createRes?.data?.id) settingIdRef.current = createRes.data.id;

      } catch (err: unknown) {
        const errMsg = (err instanceof Error ? err.message : "").toLowerCase();
        if (attempt < 2 && (errMsg.includes('404') || errMsg.includes('not found'))) {
          // retry once for network blips
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
