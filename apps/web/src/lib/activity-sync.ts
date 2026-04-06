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
    try { return JSON.parse(text) } catch { return text }
  } catch (e) {
    console.error('api_fetch_error', e)
    throw e
  }
}

function extractId(resp: any) {
  if (!resp) return null
  let d = resp.data ?? resp
  if (Array.isArray(d)) d = d[0]
  return d?.id || d?.key || d?._id || null
}

// prevent concurrent findorcreateactivity calls for the same nameconst activityCreationPromises: Record<string, Promise<string | null>> = {};

export async function findOrCreateActivity(name: string, localId?: string): Promise<string | null> {
  const cacheKey = name.toLowerCase().trim();
  if (activityCreationPromises[cacheKey]) return activityCreationPromises[cacheKey];

  const promise = (async () => {
    try {
      const mapRaw = localStorage.getItem('pkm_activity_server_map')
      const map = mapRaw ? JSON.parse(mapRaw) : { byName: {}, byLocal: {} }

      if (localId && map.byLocal && map.byLocal[localId]) return map.byLocal[localId]
      if (map.byName && map.byName[cacheKey]) {
        if (localId) {
          map.byLocal = map.byLocal || {}
          map.byLocal[localId] = map.byName[cacheKey]
          localStorage.setItem('pkm_activity_server_map', JSON.stringify(map))
        }
        return map.byName[cacheKey]
      }

      const q = encodeURIComponent(name)
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

      const created = await apiFetch(`/activities:create`, { method: 'POST', body: JSON.stringify({ name }) })
      const sid = extractId(created)
      if (sid) {
        const map2 = JSON.parse(localStorage.getItem('pkm_activity_server_map') || '{"byName":{},"byLocal":{}}')
        map2.byName[cacheKey] = sid
        if (localId) map2.byLocal[localId] = sid
        localStorage.setItem('pkm_activity_server_map', JSON.stringify(map2))
        return sid
      }
      return null
    } catch (e) {
      console.error('find_or_create_activity_failed', e)
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
      const lm = lmRaw ? JSON.parse(lmRaw) : {}
      if (lm[localLogId]) return lm[localLogId]
    }

    const payload: any = { note: note || '', rating: rating || 0, createdAt: createdAt || new Date().toISOString() }
    if (activityId) payload.activity = activityId

    const res = await apiFetch(`/activity_logs:create`, { method: 'POST', body: JSON.stringify(payload) })
    const sid = extractId(res)

    if (sid && localLogId) {
      const lm2 = JSON.parse(localStorage.getItem('pkm_activity_log_server_map') || '{}')
      lm2[localLogId] = sid
      localStorage.setItem('pkm_activity_log_server_map', JSON.stringify(lm2))
    }
    return sid
  } catch (e) {
    console.error('create_activity_log_failed', e)
    return null
  }
}

export async function syncAllLocalLogs() {
  try {
    const raw = localStorage.getItem('pkm_activity_logs')
    if (!raw) return { pushed: 0 }
    const logs = JSON.parse(raw)
    const activitiesRaw = localStorage.getItem('pkm_activities')
    const activities = activitiesRaw ? JSON.parse(activitiesRaw) : []
    const nameById: Record<string,string> = {}
    activities.forEach((a: any) => nameById[a.id] = a.name)

    let pushed = 0
    // process sequentially to avoid overwhelming server and hitting race conditions    for (const l of logs) {
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
    console.error('sync_all_local_logs_failed', e)
    throw e
  }
}
