import { useState, useEffect, useCallback } from 'react'

function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// --- Настроение: одна запись в день, 5 смайликов ---
export function useMood() {
  const [log, setLog] = useLocalState('hub-mood-v1', {}) // { '2026-08-01': 'great' }

  const setToday = useCallback((mood) => {
    setLog((prev) => ({ ...prev, [todayKey()]: mood }))
  }, [setLog])

  const today = log[todayKey()] || null

  // последние 7 дней для мини-графика
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = todayKey(d)
    last7.push({ key, mood: log[key] || null, isToday: i === 0 })
  }

  return { today, setToday, last7 }
}

// --- To-do на сегодня, обнуляется каждый новый день ---
export function useTodayTasks() {
  const [state, setState] = useLocalState('hub-tasks-v1', { date: todayKey(), items: [] })

  useEffect(() => {
    if (state.date !== todayKey()) {
      setState({ date: todayKey(), items: [] })
    }
  }, [state.date, setState])

  const addTask = useCallback((text) => {
    if (!text.trim()) return
    setState((prev) => ({
      date: todayKey(),
      items: [...prev.items, { id: crypto.randomUUID(), text: text.trim(), done: false }],
    }))
  }, [setState])

  const toggleTask = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }))
  }, [setState])

  const removeTask = useCallback((id) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((t) => t.id !== id) }))
  }, [setState])

  return { items: state.items, addTask, toggleTask, removeTask }
}

// --- Счётчики дней до событий ---
export function useCountdowns() {
  const [events, setEvents] = useLocalState('hub-countdowns-v1', [])

  const addEvent = useCallback((name, dateStr) => {
    if (!name.trim() || !dateStr) return
    setEvents((prev) => [...prev, { id: crypto.randomUUID(), name: name.trim(), date: dateStr }])
  }, [setEvents])

  const removeEvent = useCallback((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [setEvents])

  function daysUntil(dateStr) {
    const target = new Date(dateStr + 'T00:00:00')
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
    return diff
  }

  return { events, addEvent, removeEvent, daysUntil }
}
