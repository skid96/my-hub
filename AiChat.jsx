import { useState, useRef, useEffect } from 'react'

export default function AiChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Привет. Спроси о чём угодно.' },
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
      if (!res.ok) throw new Error('bad response')
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setError('Не удалось получить ответ. Проверь DEEPSEEK_API_KEY на Vercel и что /api/chat развёрнута.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="chat">
      <h2>Спросить ИИ</h2>
      <div className="chat__window" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat__bubble chat__bubble--${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="chat__bubble chat__bubble--assistant chat__bubble--loading">...</div>}
      </div>
      {error && <div className="chat__error">{error}</div>}
      <form className="chat__form" onSubmit={send}>
        <input
          className="chat__input"
          placeholder="Напиши сообщение..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="chat__send-btn" type="submit" disabled={loading}>
          Отправить
        </button>
      </form>
    </section>
  )
}
