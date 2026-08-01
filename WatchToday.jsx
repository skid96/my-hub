import { useState, useEffect, useCallback } from 'react'

const TOPICS = ['подкасты', 'наука', 'программирование', 'история', 'документалка', 'юмор']

export default function WatchToday() {
  const [topic, setTopic] = useState(TOPICS[0])
  const [videos, setVideos] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | error | ok

  const search = useCallback(async (q) => {
    setStatus('loading')
    try {
      const res = await fetch(`/api/youtube?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('bad response')
      const data = await res.json()
      setVideos(data.items || [])
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    search(topic)
  }, [topic, search])

  return (
    <section className="watch">
      <div className="watch__header">
        <h2>Что посмотреть сегодня</h2>
        <div className="watch__topics">
          {TOPICS.map((t) => (
            <button
              key={t}
              className={`watch__topic-btn ${topic === t ? 'is-active' : ''}`}
              onClick={() => setTopic(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {status === 'loading' && <p className="watch__status">Ищу видео...</p>}

      {status === 'error' && (
        <div className="watch__status watch__status--error">
          Не удалось загрузить видео. Проверь, что <code>YOUTUBE_API_KEY</code> задан в переменных
          окружения на Vercel, и что функция <code>/api/youtube</code> развёрнута.
        </div>
      )}

      {status === 'ok' && videos.length === 0 && (
        <p className="watch__status">Ничего не нашлось по «{topic}».</p>
      )}

      {status === 'ok' && videos.length > 0 && (
        <div className="watch__grid">
          {videos.map((v) => (
            <a
              key={v.id}
              className="watch__card"
              href={`https://www.youtube.com/watch?v=${v.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <img src={v.thumbnail} alt={v.title} loading="lazy" />
              <div className="watch__card-title">{v.title}</div>
              <div className="watch__card-channel">{v.channel}</div>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
