export async function apiFetch(path: string, opts: RequestInit = {}) {
  const base = (import.meta.env.VITE_NOCOBASE_URL || '/api').replace(/\/$/, '')
  const token = import.meta.env.VITE_NOCOBASE_API_TOKEN || import.meta.env.NOCOBASE_API_KEY || ''
  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}) as Record<string,string>
  }
  if (token) headers['Authorization'] = token.startsWith('Bearer') ? token : `Bearer ${token}`

  const res = await fetch(`${base}${path}`, { ...opts, headers })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

function extractId(resp: any) {
  if (!resp) return null
  let d = resp.data ?? resp
  if (Array.isArray(d)) d = d[0]
  return d?.id || d?.key || d?._id || null
}

export async function findOrCreateActivity(name: string, localId?: string) {
  // map structure: { byName: { [name]: serverId }, byLocal: { [localId]: serverId } }
  try {
    const mapRaw = localStorage.getItem('pkm_activity_server_map')
    const map = mapRaw ? JSON.parse(mapRaw) : { byName: {}, byLocal: {} }

    // prefer localId mapping if provided
    if (localId && map.byLocal && map.byLocal[localId]) return map.byLocal[localId]

    // then by name
    if (map.byName && map.byName[name]) {
      // if we have a localId, cache it too
      if (localId) {
        map.byLocal = map.byLocal || {}
        map.byLocal[localId] = map.byName[name]
        localStorage.setItem('pkm_activity_server_map', JSON.stringify(map))
      }
      return map.byName[name]
    }

    const q = encodeURIComponent(name)
    const list = await apiFetch(`/activities:list?filter[name]=${q}`)
    if (list && list.data && list.data.length > 0) {
      const sid = extractId(list.data[0]) || list.data[0].name || null
      if (sid) {
        map.byName = map.byName || {}
        map.byLocal = map.byLocal || {}
        map.byName[name] = sid
        if (localId) map.byLocal[localId] = sid
        localStorage.setItem('pkm_activity_server_map', JSON.stringify(map))
      }
      return sid
    }
  } catch (e) {
    // ignore list errors
  }

  // create new activity on server
  try {
    const created = await apiFetch(`/activities:create`, { method: 'POST', body: JSON.stringify({ name }) })
    const sid = extractId(created) || created?.data?.id || null
    if (sid) {
      const mapRaw2 = localStorage.getItem('pkm_activity_server_map')
      const map2 = mapRaw2 ? JSON.parse(mapRaw2) : { byName: {}, byLocal: {} }
      map2.byName = map2.byName || {}
      map2.byLocal = map2.byLocal || {}
      map2.byName[name] = sid
      if (localId) map2.byLocal[localId] = sid
      localStorage.setItem('pkm_activity_server_map', JSON.stringify(map2))
    }
    return sid
  } catch (e) {
    console.error('failed creating activity', e)
    return null
  }
}

export async function createActivityLog({ activityId, note, rating, createdAt, localLogId }: { activityId: string, note?: string, rating?: number, createdAt?: string, localLogId?: string }) {
  try {
    // avoid duplicate pushes by checking local->server log map
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
      const lmRaw2 = localStorage.getItem('pkm_activity_log_server_map')
      const lm2 = lmRaw2 ? JSON.parse(lmRaw2) : {}
      lm2[localLogId] = sid
      localStorage.setItem('pkm_activity_log_server_map', JSON.stringify(lm2))
    }
    return sid
  } catch (e) {
    console.error('failed to create activity_log', e)
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
      for (const l of logs) {
        const localName = nameById[l.activityId] || l.activityId || 'other'
        const serverActivityId = await findOrCreateActivity(localName, l.activityId)
        if (!serverActivityId) continue
        const created = await createActivityLog({ activityId: serverActivityId, note: l.note, rating: l.rating, createdAt: l.createdAt, localLogId: l.id })
        if (created) pushed++
    }
    return { pushed }
  } catch (e) {
    console.error('sync failed', e)
    throw e
  }
}
