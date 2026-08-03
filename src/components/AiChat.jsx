import { useState, useRef, useEffect } from 'react'

export default function AiChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Привет! Спроси меня о чём угодно.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ? `${data.error}: ${data.detail || ''}` : `HTTP ${res.status}`)
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message || 'Не удалось получить ответ.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card ai-chat-card">
      <div className="card__label">ИИ-чат</div>

      <div className="ai-chat__window" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`ai-chat__bubble ai-chat__bubble--${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="ai-chat__bubble ai-chat__bubble--assistant ai-chat__bubble--loading">
            <span className="ai-chat__dot" />
            <span className="ai-chat__dot" />
            <span className="ai-chat__dot" />
          </div>
        )}
      </div>

      {error && <div className="ai-chat__error">{error}</div>}

      <form className="ai-chat__form" onSubmit={send}>
        <input
          className="ai-chat__input"
          placeholder="Напиши сообщение..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="ai-chat__send-btn" type="submit" disabled={loading || !input.trim()} aria-label="Отправить">
          ↑
        </button>
      </form>
    </div>
  )
}
