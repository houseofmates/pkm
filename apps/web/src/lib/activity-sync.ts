import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const base = (import.meta.env.VITE_NOCOBASE_URL || '/api').replace(/\/$/, '');
  // use cached secret for consistency with the rest of the application
  const token = storageManager.getCachedSecret('nocobase_token') || import.meta.env.VITE_NOCOBASE_API_TOKEN || '';

  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}) as Record<string,string>
  };

  if (token) {
    headers['Authorization'] = token.startsWith('Bearer') ? token : `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${base}${path}`, { ...opts, headers });
    if (!res.ok) {
      throw new Error(`api_fetch_failed: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (e) {
    secureLogger.debug('api_fetch_error', e);
    throw e;
  }
}

function extractId(resp: any) {
  if (!resp) return null;
  let d = resp.data ?? resp;
  if (Array.isArray(d)) d = d[0];
  return d?.id || d?.key || d?._id || null;
}

// prevent concurrent findorcreateactivity calls for the same name
const activityCreationPromises: Record<string, Promise<string | null>> = {};

export async function findOrCreateActivity(name: string, localId?: string): Promise<string | null> {
  const cacheKey = name.toLowerCase().trim();
  if (activityCreationPromises[cacheKey]) return activityCreationPromises[cacheKey];

  const promise = (async () => {
    try {
      const mapRaw = storageManager.getItem('pkm_activity_server_map');
      const map = mapRaw ? JSON.parse(mapRaw) : { byName: {}, byLocal: {} };

      if (localId && map.byLocal && map.byLocal[localId]) return map.byLocal[localId];
      if (map.byName && map.byName[cacheKey]) {
        if (localId) {
          map.byLocal = map.byLocal || {};
          map.byLocal[localId] = map.byName[cacheKey];
          storageManager.setItem('pkm_activity_server_map', JSON.stringify(map));
        }
        return map.byName[cacheKey];
      }

      const q = encodeURIComponent(name);
      const list = await apiFetch(`/activities:list?filter[name]=${q}`);
      if (list && list.data && list.data.length > 0) {
        const sid = extractId(list.data[0]);
        if (sid) {
          map.byName[cacheKey] = sid;
          if (localId) map.byLocal[localId] = sid;
          storageManager.setItem('pkm_activity_server_map', JSON.stringify(map));
          return sid;
        }
      }

      const created = await apiFetch(`/activities:create`, { method: 'POST', body: JSON.stringify({ name }) });
      const sid = extractId(created);
      if (sid) {
        // reload map to avoid overwriting changes from other concurrent syncs
        const currentMapRaw = storageManager.getItem('pkm_activity_server_map');
        const currentMap = currentMapRaw ? JSON.parse(currentMapRaw) : { byName: {}, byLocal: {} };
        currentMap.byName[cacheKey] = sid;
        if (localId) currentMap.byLocal[localId] = sid;
        storageManager.setItem('pkm_activity_server_map', JSON.stringify(currentMap));
        return sid;
      }
      return null;
    } catch (e) {
      secureLogger.debug('find_or_create_activity_failed', e);
      return null;
    } finally {
      delete activityCreationPromises[cacheKey];
    }
  })();

  activityCreationPromises[cacheKey] = promise;
  return promise;
}

export async function createActivityLog({ activityId, note, rating, createdAt, localLogId }: { activityId: string, note?: string, rating?: number, createdAt?: string, localLogId?: string }) {
  try {
    if (localLogId) {
      const lmRaw = storageManager.getItem('pkm_activity_log_server_map');
      const lm = lmRaw ? JSON.parse(lmRaw) : {};
      if (lm[localLogId]) return lm[localLogId];
    }

    const payload: any = { note: note || '', rating: rating || 0, createdAt: createdAt || new Date().toISOString() };
    if (activityId) payload.activity = activityId;

    const res = await apiFetch(`/activity_logs:create`, { method: 'POST', body: JSON.stringify(payload) });
    const sid = extractId(res);

    if (sid && localLogId) {
      const currentLmRaw = storageManager.getItem('pkm_activity_log_server_map');
      const currentLm = currentLmRaw ? JSON.parse(currentLmRaw) : {};
      currentLm[localLogId] = sid;
      storageManager.setItem('pkm_activity_log_server_map', JSON.stringify(currentLm));
    }
    return sid;
  } catch (e) {
    secureLogger.debug('create_activity_log_failed', e);
    return null;
  }
}

export async function syncAllLocalLogs() {
  try {
    const raw = storageManager.getItem('pkm_activity_logs');
    if (!raw) return { pushed: 0 };
    const logs = JSON.parse(raw);
    const activitiesRaw = storageManager.getItem('pkm_activities');
    const activities = activitiesRaw ? JSON.parse(activitiesRaw) : [];
    const nameById: Record<string,string> = {};
    activities.forEach((a: any) => nameById[a.id] = a.name);

    let pushed = 0;
    // process sequentially to avoid overwhelming server and hitting race conditions
    for (const l of logs) {
      const localName = nameById[l.activityId] || l.activityId || 'other';
      const serverActivityId = await findOrCreateActivity(localName, l.activityId);
      if (!serverActivityId) continue;

      const created = await createActivityLog({
        activityId: serverActivityId,
        note: l.note,
        rating: l.rating,
        createdAt: l.createdAt,
        localLogId: l.id
      });
      if (created) pushed++;
    }
    return { pushed };
  } catch (e) {
    secureLogger.debug('sync_all_local_logs_failed', e);
    throw e;
  }
}
