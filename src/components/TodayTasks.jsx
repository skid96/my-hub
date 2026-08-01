import { useState } from 'react'
import { useTodayTasks } from '../hooks/useTrackers'

export default function TodayTasks() {
  const { items, addTask, toggleTask, removeTask } = useTodayTasks()
  const [text, setText] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!text.trim()) return
    addTask(text)
    setText('')
  }

  const doneCount = items.filter((t) => t.done).length

  return (
    <div className="card">
      <div className="notes-card__header">
        <div className="card__label">Задачи на сегодня</div>
        {items.length > 0 && (
          <div className="tasks__counter">{doneCount}/{items.length}</div>
        )}
      </div>

      <form className="tasks__form" onSubmit={handleAdd}>
        <input
          className="note-form__title"
          placeholder="Добавить задачу..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </form>

      <ul className="tasks__list">
        {items.length === 0 && (
          <li className="note-list__empty">Список пуст. Список обновится завтра сам.</li>
        )}
        {items.map((t) => (
          <li key={t.id} className="task-item">
            <button
              className={`habit-item__check ${t.done ? 'is-done' : ''}`}
              onClick={() => toggleTask(t.id)}
              aria-label={t.done ? 'Снять отметку' : 'Отметить выполненным'}
            >
              {t.done ? '✓' : ''}
            </button>
            <span className={`task-item__text ${t.done ? 'is-done' : ''}`}>{t.text}</span>
            <button
              className="note-list__delete"
              onClick={() => removeTask(t.id)}
              aria-label="Удалить задачу"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
