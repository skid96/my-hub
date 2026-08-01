import { getTodayQuote, getTodayFact } from '../data/daily'

export default function DayCard() {
  const quote = getTodayQuote()
  const fact = getTodayFact()

  return (
    <div className="card">
      <div className="card__label">Цитата дня</div>
      <p className="card__quote">{quote.text}</p>
      <div className="card__author">{quote.author}</div>

      <div className="card__divider" />

      <div className="card__label">Факт дня</div>
      <p className="card__fact">{fact}</p>
    </div>
  )
}
