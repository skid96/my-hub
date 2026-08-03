export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY is not set' })
  }

  const { messages } = req.body || {}
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' })
  }

  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Отвечай кратко, дружелюбно и по делу, на русском языке, если пользователь не пишет на другом.',
          },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 800,
      }),
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return res.status(502).json({ error: 'Upstream error', detail: text })
    }

    const data = await upstream.json()
    const reply = data.choices?.[0]?.message?.content ?? 'Пустой ответ.'
    return res.status(200).json({ reply })
  } catch (err) {
    return res.status(500).json({ error: 'Request failed', detail: String(err) })
  }
}

