import { useEffect, useRef, useState, useCallback } from 'react';
import { secureLogger } from '@/lib/secure-logger';

interface SystemStatus {
  backendOnline: boolean;
  lastSeen: number;
  latencyMs: number;
}

export function useSystemStatus(): SystemStatus {
  const [status, setStatus] = useState<SystemStatus>({
    backendOnline: false,
    lastSeen: 0,
    latencyMs: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // skip polling when browser is offline
      return;
    }

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);

      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        setStatus({
          backendOnline: true,
          lastSeen: Date.now(),
          latencyMs,
        });
      } else {
        setStatus(prev => ({
          backendOnline: false,
          lastSeen: prev.lastSeen,
          latencyMs: 0,
        }));
      }
    } catch (err) {
      setStatus(prev => ({
        backendOnline: false,
        lastSeen: prev.lastSeen,
        latencyMs: 0,
      }));
      secureLogger.debug('[SystemStatus] health poll failed', err);
    }
  }, []);

  useEffect(() => {
    // initial poll
    poll();

    intervalRef.current = setInterval(() => {
      poll();
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [poll]);

  return status;
}
