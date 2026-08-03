export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set on the server' })
    }

    const body = req.body || {}
    const messages = body.messages
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array', received: typeof messages })
    }

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://my-hub-rho.vercel.app',
        'X-Title': 'My Hub',
      },
      body: JSON.stringify({
        model: 'inclusionai/ling-3.0-flash:free',
        messages: [
          {
            role: 'system',
            content: 'Отвечай кратко, дружелюбно и по делу, на русском языке, если пользователь не пишет на другом.',
          },
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 800,
      }),
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return res.status(502).json({
        error: 'Upstream error',
        status: upstream.status,
        detail: text,
      })
    }

    const data = await upstream.json()
    const reply = data.choices?.[0]?.message?.content ?? 'Пустой ответ.'

    return res.status(200).json({ reply })
  } catch (err) {
    return res.status(500).json({
      error: 'Handler crashed',
      detail: String(err?.stack ?? err),
    })
  }
  }
