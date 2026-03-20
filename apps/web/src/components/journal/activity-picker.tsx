import React, { useEffect, useState } from 'react'

interface Activity {
  id: string
  name: string
}

const STORAGE_KEY = 'pkm_activities'

function loadActivities(): Activity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveActivities(items: Activity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

interface Props {
  value?: string | null
  onChange?: (id: string) => void
}

const ActivityPicker: React.FC<Props> = ({ value, onChange }) => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    const items = loadActivities()
    if (items.length === 0) {
      const defaults = [
        { id: '1', name: 'walk' },
        { id: '2', name: 'brush teeth' },
        { id: '3', name: 'meditate' }
      ]
      saveActivities(defaults)
      setActivities(defaults)
    } else setActivities(items)
  }, [])

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const item = { id: Date.now().toString(), name: trimmed }
    const next = [...activities, item]
    saveActivities(next)
    setActivities(next)
    setNewName('')
    setCreating(false)
    onChange?.(item.id)
  }

  return (
    <div>
      <div className="flex gap-2 items-center">
        <select value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 w-full">
          <option value="">select activity</option>
          {activities.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <button className="px-2 py-1 bg-emerald-600 rounded text-white" onClick={() => setCreating(v => !v)}>
          {creating ? 'cancel' : 'new'}
        </button>
      </div>
      {creating && (
        <div className="mt-2 flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 p-2 rounded bg-slate-900 border border-slate-700" placeholder="activity name" />
          <button className="px-3 py-1 bg-emerald-500 rounded text-white" onClick={handleCreate}>create</button>
        </div>
      )}
    </div>
  )
}

export default ActivityPicker
