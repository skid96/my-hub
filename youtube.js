export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY is not set' })
  }

  const q = req.query.q || 'интересное видео'

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('q', q)
    url.searchParams.set('type', 'video')
    url.searchParams.set('maxResults', '9')
    url.searchParams.set('relevanceLanguage', 'ru')
    url.searchParams.set('key', apiKey)

    const upstream = await fetch(url.toString())
    if (!upstream.ok) {
      const text = await upstream.text()
      return res.status(502).json({ error: 'Upstream error', detail: text })
    }

    const data = await upstream.json()
    const items = (data.items || []).map((it) => ({
      id: it.id.videoId,
      title: it.snippet.title,
      channel: it.snippet.channelTitle,
      thumbnail: it.snippet.thumbnails?.medium?.url,
    }))

    return res.status(200).json({ items })
  } catch (err) {
    return res.status(500).json({ error: 'Request failed', detail: String(err) })
  }
}
