import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card'

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

const LogsCalendar: React.FC = () => {
  const [logs, setLogs] = useState<LogItem[]>([])

  useEffect(() => { setLogs(loadLogs()) }, [])

  // group by date (yyyy-mm-dd)
  const byDate: Record<string, LogItem[]> = {}
  logs.forEach(l => {
    const d = new Date(l.createdAt).toISOString().slice(0,10)
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(l)
  })

  const dates = Object.keys(byDate).sort((a,b) => b.localeCompare(a))

  return (
    <Card>
      <CardHeader>
        <CardTitle>calendar view</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {dates.length === 0 && <div className="p-3 text-sm text-slate-500">no logs yet</div>}
          {dates.map(d => (
            <div key={d} className="p-3 bg-slate-900/30 rounded">
              <div className="text-sm text-slate-300 font-medium">{d}</div>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {byDate[d].map(l => (
                  <div key={l.id} className="p-2 bg-slate-800 rounded flex justify-between items-center">
                    <div>
                      <div className="text-sm text-slate-200">{l.activityId}</div>
                      <div className="text-xs text-slate-400 truncate">{l.note}</div>
                    </div>
                    <div className="text-xs text-emerald-400">{l.rating ? `⭐ ${l.rating}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default LogsCalendar
