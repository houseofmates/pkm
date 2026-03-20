import React, { useState } from 'react'
import ActivityPicker from './activity-picker'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

interface Activity {
  id: string
  name: string
}

interface LogBlockProps {
  onSave?: (log: any) => void
}

const sampleActivities: Activity[] = [
  { id: '1', name: 'walk' },
  { id: '2', name: 'brush teeth' },
  { id: '3', name: 'meditate' }
]

const LogBlock: React.FC<LogBlockProps> = ({ onSave }) => {
  const [activity, setActivity] = useState<string | null>(sampleActivities[0].id)
  const [note, setNote] = useState('')
  const [rating, setRating] = useState<number>(3)

    const handleSave = () => {
      const payload = {
        id: Date.now().toString(),
        activityId: activity,
        note,
        rating,
        createdAt: new Date().toISOString()
      }
      try {
        const raw = localStorage.getItem('pkm_activity_logs')
        const arr = raw ? JSON.parse(raw) : []
        arr.push(payload)
        localStorage.setItem('pkm_activity_logs', JSON.stringify(arr))
        // notify other components
        window.dispatchEvent(new CustomEvent('pkm:activity-log-saved', { detail: payload }))
      } catch (e) {
        console.error('failed saving log', e)
      }
      if (onSave) onSave(payload)
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle>quick log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm text-slate-400">activity</label>
            <ActivityPicker value={activity} onChange={(id) => setActivity(id)} />

          <label className="text-sm text-slate-400">note</label>
          <Input value={note} onChange={(e) => setNote((e.target as HTMLInputElement).value)} />

          <label className="text-sm text-slate-400">rating</label>
          <div className="flex items-center gap-2">
            {[1,2,3,4,5].map(n => (
              <Button key={n} variant={rating===n ? 'default' : 'ghost'} size="sm" onClick={() => setRating(n)}>{n}</Button>
            ))}
          </div>

          <div className="pt-2">
            <Button onClick={handleSave} className="w-full">save log</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default LogBlock
