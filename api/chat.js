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

    // Use the smaller free model requested by you
    const model = 'inclusionai/ling-3.0-tiny:free'

    // If client sets stream: true in the request body, we'll proxy a streaming
    // response from the upstream and stream it to the client (SSE-ish).
    const shouldStream = Boolean(body.stream)

    const upstreamResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://my-hub-rho.vercel.app',
        'X-Title': 'My Hub',
        Accept: shouldStream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Отвечай кратко, дружелюбно и по делу, на русском языке, если пользователь не пишет на другом.',
          },
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 800,
        stream: shouldStream,
      }),
    })

    if (!upstreamResp.ok) {
      const text = await upstreamResp.text()
      return res.status(502).json({
        error: 'Upstream error',
        status: upstreamResp.status,
        detail: text,
      })
    }

    if (!shouldStream) {
      // Non-streaming path: return the full reply as JSON (backward compatible)
      const data = await upstreamResp.json()
      const reply = data.choices?.[0]?.message?.content ?? 'Пустой ответ.'
      return res.status(200).json({ reply })
    }

    // Streaming path: proxy the upstream stream to the client.
    // We'll use Server-Sent Events (text/event-stream) so the frontend can
    // subscribe and receive incremental updates.
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    // Some platforms (like Vercel) may buffer responses; flush headers where possible.
    if (res.flush) res.flush()

    const reader = upstreamResp.body.getReader()
    const decoder = new TextDecoder()

    // Read upstream chunks and forward them to the client as-is.
    // If upstream already uses SSE (data: ...), we forward raw chunks. If it sends
    // raw JSON fragments, the client will receive them incrementally as well.
    let done = false
    while (!done) {
      const { value, done: readerDone } = await reader.read()
      if (readerDone) {
        done = true
        break
      }
      const chunk = decoder.decode(value, { stream: true })

      try {
        // Forward the raw chunk. We wrap it in an SSE "data:" frame to make it
        // easy for clients using EventSource to parse. If the chunk already
        // contains "data:" lines, this simply concatenates them.
        const sseChunk = `data: ${chunk.replace(/\n/g, '\ndata: ')}\n\n`
        res.write(sseChunk)
      } catch (e) {
        // If writing fails, stop streaming
        console.error('Write to client failed', e)
        break
      }

      // try to flush
      if (res.flush) res.flush()
    }

    // Signal end of stream
    try {
      res.write('event: done\ndata: [DONE]\n\n')
    } catch (e) {
      // ignore
    }
    return res.end()
  } catch (err) {
    return res.status(500).json({
      error: 'Handler crashed',
      detail: String(err?.stack ?? err),
    })
  }
}
