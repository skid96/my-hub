const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

export default function Greeting({ theme, now }) {
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const dateLabel = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`

  return (
    <div className="greeting">
      <div className="greeting__clock">{hh}:{mm}</div>
      <div className="greeting__date">{dateLabel}</div>
      <h1 className="greeting__title">{theme.greeting}</h1>
      <p className="greeting__sub">{theme.sub}</p>
    </div>
  )
}
