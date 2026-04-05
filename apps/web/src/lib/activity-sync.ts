import { secureLogger } from '@pkm/core/lib/secure-logger';

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const base = (import.meta.env.VITE_NOCOBASE_URL || '/api').replace(/\/$/, '')
  const token = import.meta.env.VITE_NOCOBASE_API_TOKEN || import.meta.env.NOCOBASE_API_KEY || ''
  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}) as Record<string,string>
  }
  if (token) headers['Authorization'] = token.startsWith('Bearer') ? token : `Bearer ${token}`

  try {
    const res = await fetch(`${base}${path}`, { ...opts, headers })
    if (!res.ok) throw new Error(`api_fetch_failed: ${res.status} ${res.statusText}`)
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  } catch (e) {
    secureLogger.debug('api_fetch_error', e)
    throw e
  }
}

function extractId(resp: any) {
  if (!resp) return null
  let d = resp.data ?? resp
  if (Array.isArray(d)) d = d[0]
  return d?.id || d?.key || d?._id || null
}

// prevent concurrent find_or_create_activity calls for the same name to maintain data integrity
const activityCreationPromises: Record<string, Promise<string | null>> = {};

export async function findOrCreateActivity(name: string, localId?: string): Promise<string | null> {
  // strictly lowercase and trim name for deterministic matching
  const cacheKey = (name || '').toLowerCase().trim();
  if (!cacheKey) return null;
  if (activityCreationPromises[cacheKey]) return activityCreationPromises[cacheKey];

  const promise = (async () => {
    try {
      const mapRaw = localStorage.getItem('pkm_activity_server_map')
      let map = { byName: {} as any, byLocal: {} as any }
      try {
        if (mapRaw) map = JSON.parse(mapRaw);
      } catch (err) {
        secureLogger.warn('corrupted activity map in storage - resetting', err);
      }

      // use cached server id if available
      if (localId && map.byLocal && map.byLocal[localId]) return map.byLocal[localId]
      if (map.byName && map.byName[cacheKey]) {
        if (localId) {
          map.byLocal = map.byLocal || {}
          map.byLocal[localId] = map.byName[cacheKey]
          localStorage.setItem('pkm_activity_server_map', JSON.stringify(map))
        }
        return map.byName[cacheKey]
      }

      // attempt to find existing activity on server before creating new one
      const q = encodeURIComponent(cacheKey)
      const list = await apiFetch(`/activities:list?filter[name]=${q}`)
      if (list && list.data && list.data.length > 0) {
        const sid = extractId(list.data[0])
        if (sid) {
          map.byName[cacheKey] = sid
          if (localId) map.byLocal[localId] = sid
          localStorage.setItem('pkm_activity_server_map', JSON.stringify(map))
          return sid
        }
      }

      // create new activity if not found
      const created = await apiFetch(`/activities:create`, { method: 'POST', body: JSON.stringify({ name }) })
      const sid = extractId(created)
      if (sid) {
        // reload map from storage to avoid race condition with other sync processes
        let latestMap = { byName: {} as any, byLocal: {} as any };
        try {
          latestMap = JSON.parse(localStorage.getItem('pkm_activity_server_map') || '{"byName":{},"byLocal":{}}');
        } catch { /* use default */ }

        latestMap.byName[cacheKey] = sid
        if (localId) latestMap.byLocal[localId] = sid
        localStorage.setItem('pkm_activity_server_map', JSON.stringify(latestMap))
        return sid
      }
      return null
    } catch (e) {
      secureLogger.debug('find_or_create_activity_failed', e)
      return null
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
      const lmRaw = localStorage.getItem('pkm_activity_log_server_map')
      let lm: any = {}
      try {
        if (lmRaw) lm = JSON.parse(lmRaw);
      } catch { /* ignore */ }

      if (lm[localLogId]) return lm[localLogId]
    }

    const payload: any = { note: note || '', rating: rating || 0, createdAt: createdAt || new Date().toISOString() }
    if (activityId) payload.activity = activityId

    const res = await apiFetch(`/activity_logs:create`, { method: 'POST', body: JSON.stringify(payload) })
    const sid = extractId(res)

    if (sid && localLogId) {
      let latestLm: any = {}
      try {
        latestLm = JSON.parse(localStorage.getItem('pkm_activity_log_server_map') || '{}');
      } catch { /* ignore */ }
      latestLm[localLogId] = sid
      localStorage.setItem('pkm_activity_log_server_map', JSON.stringify(latestLm))
    }
    return sid
  } catch (e) {
    secureLogger.debug('create_activity_log_failed', e)
    return null
  }
}

export async function syncAllLocalLogs() {
  try {
    const raw = localStorage.getItem('pkm_activity_logs')
    if (!raw) return { pushed: 0 }

    let logs: any[] = [];
    try {
      logs = JSON.parse(raw);
    } catch (err) {
      secureLogger.error('failed to parse local activity logs', err);
      return { pushed: 0 };
    }

    const activitiesRaw = localStorage.getItem('pkm_activities')
    let activities: any[] = [];
    try {
      if (activitiesRaw) activities = JSON.parse(activitiesRaw);
    } catch { /* ignore */ }

    const nameById: Record<string,string> = {}
    activities.forEach((a: any) => {
      if (a.id && a.name) nameById[a.id] = a.name;
    });

    let pushed = 0
    // process sequentially to maintain pkm integrity and avoid overlapping api requests
    for (const l of logs) {
      const localName = nameById[l.activityId] || l.activityId || 'other'
      const serverActivityId = await findOrCreateActivity(localName, l.activityId)
      if (!serverActivityId) continue

      const created = await createActivityLog({
        activityId: serverActivityId,
        note: l.note,
        rating: l.rating,
        createdAt: l.createdAt,
        localLogId: l.id
      })
      if (created) pushed++
    }
    return { pushed }
  } catch (e) {
    secureLogger.debug('sync_all_local_logs_failed', e)
    throw e
  }
}
