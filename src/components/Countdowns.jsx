import { useState } from 'react'
import { useCountdowns } from '../hooks/useTrackers'

export default function Countdowns() {
  const { events, addEvent, removeEvent, daysUntil } = useCountdowns()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim() || !date) return
    addEvent(name, date)
    setName('')
    setDate('')
    setAdding(false)
  }

  const sorted = [...events].sort((a, b) => daysUntil(a.date) - daysUntil(b.date))

  return (
    <div className="card">
      <div className="notes-card__header">
        <div className="card__label">Отсчёт до событий</div>
        <button className="icon-btn" onClick={() => setAdding((v) => !v)} aria-label="Новое событие">
          {adding ? '×' : '+'}
        </button>
      </div>

      {adding && (
        <form className="note-form" onSubmit={handleAdd}>
          <input
            className="note-form__title"
            placeholder="Название события"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            type="date"
            className="note-form__title"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button type="submit" className="note-form__save">Добавить</button>
        </form>
      )}

      <ul className="countdown-list">
        {sorted.length === 0 && !adding && (
          <li className="note-list__empty">Нет запланированных событий.</li>
        )}
        {sorted.map((ev) => {
          const days = daysUntil(ev.date)
          return (
            <li key={ev.id} className="countdown-item">
              <div className="countdown-item__text">
                <div className="countdown-item__name">{ev.name}</div>
                <div className="countdown-item__date">
                  {new Date(ev.date + 'T00:00:00').toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </div>
              </div>
              <div className={`countdown-item__days ${days < 0 ? 'is-past' : ''}`}>
                {days === 0 ? 'Сегодня' : days > 0 ? `${days} дн.` : 'Прошло'}
              </div>
              <button
                className="note-list__delete"
                onClick={() => removeEvent(ev.id)}
                aria-label="Удалить событие"
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
