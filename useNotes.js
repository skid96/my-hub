import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'hub-notes-v1'

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

export function useNotes() {
  const [notes, setNotes] = useState(loadNotes)

  useEffect(() => {
    saveNotes(notes)
  }, [notes])

  const addNote = useCallback((title, body) => {
    const note = {
      id: crypto.randomUUID(),
      title: title.trim() || 'Без названия',
      body: body.trim(),
      createdAt: Date.now(),
    }
    setNotes((prev) => [note, ...prev])
    return note
  }, [])

  const deleteNote = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return { notes, addNote, deleteNote }
}
