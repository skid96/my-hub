import { useState } from 'react'
import { useHabits } from '../hooks/useTrackers'

export default function HabitTracker() {
  const { habits, addHabit, removeHabit, toggleToday, getStreak, isDoneToday } = useHabits()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    addHabit(name)
    setName('')
    setAdding(false)
  }

  return (
    <div className="card">
      <div className="notes-card__header">
        <div className="card__label">Привычки</div>
        <button className="icon-btn" onClick={() => setAdding((v) => !v)} aria-label="Новая привычка">
          {adding ? '×' : '+'}
        </button>
      </div>

      {adding && (
        <form className="note-form" onSubmit={handleAdd}>
          <input
            className="note-form__title"
            placeholder="Например, пить воду"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="note-form__save">Добавить</button>
        </form>
      )}

      <ul className="habit-list">
        {habits.length === 0 && !adding && (
          <li className="note-list__empty">Пока нет привычек. Нажми «+», чтобы добавить первую.</li>
        )}
        {habits.map((h) => {
          const done = isDoneToday(h.id)
          const streak = getStreak(h.id)
          return (
            <li key={h.id} className="habit-item">
              <button
                className={`habit-item__check ${done ? 'is-done' : ''}`}
                onClick={() => toggleToday(h.id)}
                aria-label={done ? 'Снять отметку' : 'Отметить выполненным'}
              >
                {done ? '✓' : ''}
              </button>
              <div className="habit-item__text">
                <div className={`habit-item__name ${done ? 'is-done' : ''}`}>{h.name}</div>
                {streak > 0 && (
                  <div className="habit-item__streak">🔥 {streak} {streakLabel(streak)}</div>
                )}
              </div>
              <button
                className="note-list__delete"
                onClick={() => removeHabit(h.id)}
                aria-label="Удалить привычку"
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

function streakLabel(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'дня'
  return 'дней'
}
