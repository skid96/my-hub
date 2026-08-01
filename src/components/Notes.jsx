import { useState } from 'react'
import { useNotes } from '../hooks/useNotes'

export default function Notes() {
  const { notes, addNote, deleteNote } = useNotes()
  const [composing, setComposing] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!title.trim() && !body.trim()) return
    addNote(title, body)
    setTitle('')
    setBody('')
    setComposing(false)
  }

  return (
    <div className="card notes-card">
      <div className="notes-card__header">
        <div className="card__label">Заметки</div>
        <button className="icon-btn" onClick={() => setComposing((v) => !v)} aria-label="Новая заметка">
          {composing ? '×' : '+'}
        </button>
      </div>

      {composing && (
        <form className="note-form" onSubmit={handleAdd}>
          <input
            className="note-form__title"
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="note-form__body"
            placeholder="Записать мысль..."
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button type="submit" className="note-form__save">Сохранить</button>
        </form>
      )}

      <ul className="note-list">
        {notes.length === 0 && !composing && (
          <li className="note-list__empty">Пока пусто. Нажми «+», чтобы записать первую мысль.</li>
        )}
        {notes.map((n) => (
          <li key={n.id} className="note-list__item">
            <div className="note-list__text">
              <div className="note-list__title">{n.title}</div>
              {n.body && <div className="note-list__body">{n.body}</div>}
            </div>
            <button
              className="note-list__delete"
              onClick={() => deleteNote(n.id)}
              aria-label="Удалить заметку"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
