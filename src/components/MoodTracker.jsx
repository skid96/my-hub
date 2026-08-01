import { useMood } from '../hooks/useTrackers'

const MOODS = [
  { key: 'great', emoji: '😄', label: 'Отлично' },
  { key: 'good', emoji: '🙂', label: 'Хорошо' },
  { key: 'meh', emoji: '😐', label: 'Так себе' },
  { key: 'bad', emoji: '😕', label: 'Плохо' },
  { key: 'awful', emoji: '😞', label: 'Ужасно' },
]

const MOOD_MAP = Object.fromEntries(MOODS.map((m) => [m.key, m]))
const WEEKDAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export default function MoodTracker() {
  const { today, setToday, last7 } = useMood()

  return (
    <div className="card">
      <div className="card__label">Настроение</div>

      <div className="mood-picker">
        {MOODS.map((m) => (
          <button
            key={m.key}
            className={`mood-picker__btn ${today === m.key ? 'is-active' : ''}`}
            onClick={() => setToday(m.key)}
            aria-label={m.label}
          >
            {m.emoji}
          </button>
        ))}
      </div>

      <div className="mood-week">
        {last7.map((d) => {
          const date = new Date(d.key)
          return (
            <div key={d.key} className={`mood-week__day ${d.isToday ? 'is-today' : ''}`}>
              <div className="mood-week__emoji">
                {d.mood ? MOOD_MAP[d.mood].emoji : <span className="mood-week__dot" />}
              </div>
              <div className="mood-week__label">{WEEKDAY_SHORT[date.getDay()]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
