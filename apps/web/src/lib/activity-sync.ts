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

export async function findOrCreateActivity(name: string) {
  // try list filter
  try {
    // cached mapping to avoid recreating activities repeatedly
    const mapRaw = localStorage.getItem('pkm_activity_server_map')
    const map = mapRaw ? JSON.parse(mapRaw) : {}
    if (map[name]) return map[name]

    const q = encodeURIComponent(name)
    const list = await apiFetch(`/activities:list?filter[name]=${q}`)
    if (list && list.data && list.data.length > 0) {
      const sid = extractId(list.data[0]) || list.data[0].name || null
      if (sid) {
        map[name] = sid
        localStorage.setItem('pkm_activity_server_map', JSON.stringify(map))
      }
      return sid
    }
  } catch (e) {
    // ignore
  }

  // create
  try {
    const created = await apiFetch(`/activities:create`, { method: 'POST', body: JSON.stringify({ name }) })
    const sid = extractId(created) || created?.data?.id || null
    if (sid) {
      const mapRaw2 = localStorage.getItem('pkm_activity_server_map')
      const map2 = mapRaw2 ? JSON.parse(mapRaw2) : {}
      map2[name] = sid
      localStorage.setItem('pkm_activity_server_map', JSON.stringify(map2))
    }
    return sid
  } catch (e) {
    console.error('failed creating activity', e)
    return null
  }
}

export async function createActivityLog({ activityId, note, rating, createdAt }: { activityId: string, note?: string, rating?: number, createdAt?: string }) {
  try {
    const payload: any = { note: note || '', rating: rating || 0, createdAt: createdAt || new Date().toISOString() }
    // pointer field to activity
    if (activityId) payload.activity = activityId
    const res = await apiFetch(`/activity_logs:create`, { method: 'POST', body: JSON.stringify(payload) })
    return extractId(res)
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
      const serverActivityId = await findOrCreateActivity(localName)
      if (!serverActivityId) continue
      const created = await createActivityLog({ activityId: serverActivityId, note: l.note, rating: l.rating, createdAt: l.createdAt })
      if (created) pushed++
    }
    return { pushed }
  } catch (e) {
    console.error('sync failed', e)
    throw e
  }
}
