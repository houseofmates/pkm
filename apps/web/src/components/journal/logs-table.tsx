import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface LogItem {
  id: string
  activityId: string
  note?: string
  rating?: number
  createdAt: string
}

function loadLogs(): LogItem[] {
  try {
    const raw = localStorage.getItem('pkm_activity_logs')
    if (!raw) return []
    return JSON.parse(raw) as LogItem[]
  } catch {
    return []
  }
}

const LogsTable: React.FC = () => {
  const [logs, setLogs] = useState<LogItem[]>([])

  const refresh = useCallback(() => {
    setLogs(loadLogs())
  }, [])

  useEffect(() => {
    refresh()
    const onSaved = () => refresh()
    window.addEventListener('pkm:activity-log-saved', onSaved as EventListener)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pkm_activity_logs') refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('pkm:activity-log-saved', onSaved as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh])

  const handleDelete = (id: string) => {
    const next = logs.filter(l => l.id !== id)
    localStorage.setItem('pkm_activity_logs', JSON.stringify(next))
    setLogs(next)
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>recent logs ({logs.length})</CardTitle>
        <div className="flex items-center gap-2">
          <input type="file" accept="application/json" onChange={(e) => {
            const f = e.target.files && e.target.files[0]
            if (!f) return
            const reader = new FileReader()
            reader.onload = () => {
              try {
                const data = JSON.parse(String(reader.result))
                localStorage.setItem('pkm_activity_logs', JSON.stringify(data))
                setLogs(Array.isArray(data) ? data : [])
              } catch (err) { console.error(err) }
            }
            reader.readAsText(f)
          }} className="hidden" id="logs-import" />
          <label htmlFor="logs-import" className="cursor-pointer px-2 py-1 rounded bg-slate-800 text-sm text-slate-300">import</label>
          <Button variant="ghost" size="sm" onClick={() => {
            const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `pkm-activity-logs-${Date.now()}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}>export</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-800">
          {logs.length === 0 && <div className="p-4 text-sm text-slate-500">no logs yet</div>}
          {logs.map(l => (
            <div key={l.id} className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm text-slate-200">{l.activityId}</div>
                <div className="text-xs text-slate-400 truncate">{l.note}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-emerald-400">{l.rating ? `⭐ ${l.rating}` : ''}</div>
                <div className="text-xs text-slate-500">{new Date(l.createdAt).toLocaleString()}</div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(l.id)}>delete</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default LogsTable
