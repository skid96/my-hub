import { useRef, useEffect, useState, useCallback } from 'react'
import { useDayTheme } from '../hooks/useDayTheme'

const GRID = 16
const START_TICK_MS = 180
const MIN_TICK_MS = 75
const SPEEDUP_PER_APPLE = 5

function randCell(exclude) {
  let cell
  do {
    cell = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
  } while (exclude.some((c) => c.x === cell.x && c.y === cell.y))
  return cell
}

// Синтезированный ASMR-звук укуса яблока: короткий фильтрованный шум + щелчок
function playBiteSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime

    // Хруст: короткий band-passed noise burst
    const bufferSize = ctx.sampleRate * 0.12
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 1800
    bandpass.Q.value = 0.9

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.35, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    noise.connect(bandpass)
    bandpass.connect(noiseGain)
    noiseGain.connect(ctx.destination)

    // Приятный "поп" тон сверху
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(700, now)
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.09)

    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(0.18, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

    osc.connect(oscGain)
    oscGain.connect(ctx.destination)

    noise.start(now)
    osc.start(now)
    noise.stop(now + 0.13)
    osc.stop(now + 0.11)

    setTimeout(() => ctx.close(), 300)
  } catch {
    // тихо игнорируем, если Web Audio недоступен
  }
}

function playGameOverSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.4)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.45)
    setTimeout(() => ctx.close(), 600)
  } catch {
    // ignore
  }
}

export default function SnakeGame() {
  const canvasRef = useRef(null)
  const { theme } = useDayTheme()

  const stateRef = useRef({
    snake: [{ x: 8, y: 8 }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    apple: { x: 12, y: 8 },
    render: [{ x: 8, y: 8 }], // интерполированные позиции для плавности
  })

  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => Number(localStorage.getItem('hub-snake-best') || 0))
  const [status, setStatus] = useState('idle') // idle | playing | over
  const [bump, setBump] = useState(false)

  const reset = useCallback(() => {
    const snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]
    stateRef.current = {
      snake,
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      apple: randCell(snake),
      render: snake.map((s) => ({ ...s })),
    }
    setScore(0)
    setStatus('playing')
  }, [])

  const setDirection = useCallback((x, y) => {
    const s = stateRef.current
    if (s.dir.x === -x && s.dir.y === -y) return // нельзя развернуться на 180°
    s.nextDir = { x, y }
  }, [])

  // Игровой цикл (логика) — скорость растёт с каждым съеденным яблоком
  useEffect(() => {
    if (status !== 'playing') return
    let timeoutId
    let cancelled = false

    function tick() {
      const s = stateRef.current
      s.dir = s.nextDir
      const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y }

      const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID
      const hitSelf = s.snake.some((seg) => seg.x === head.x && seg.y === head.y)

      if (hitWall || hitSelf) {
        setStatus('over')
        playGameOverSound()
        setBest((prevBest) => {
          const newBest = Math.max(prevBest, s.snake.length - 3)
          localStorage.setItem('hub-snake-best', String(newBest))
          return newBest
        })
        return
      }

      const ateApple = head.x === s.apple.x && head.y === s.apple.y
      s.snake = [head, ...s.snake]
      if (ateApple) {
        s.apple = randCell(s.snake)
        setScore((sc) => sc + 1)
        playBiteSound()
        setBump(true)
        setTimeout(() => setBump(false), 150)
      } else {
        s.snake.pop()
      }

      if (cancelled) return
      const applesEaten = s.snake.length - 3
      const currentTick = Math.max(MIN_TICK_MS, START_TICK_MS - applesEaten * SPEEDUP_PER_APPLE)
      timeoutId = setTimeout(tick, currentTick)
    }

    timeoutId = setTimeout(tick, START_TICK_MS)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [status])

  // Рендер (canvas), с плавной интерполяцией между тиками
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const size = canvas.clientWidth
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)
    const cell = size / GRID

    let raf
    let visible = true
    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting },
      { threshold: 0.01 }
    )
    observer.observe(canvas)

    function draw() {
      if (!visible) {
        raf = requestAnimationFrame(draw)
        return
      }
      const s = stateRef.current

      // интерполяция render-позиций к целевым (плавное скольжение)
      if (s.render.length !== s.snake.length) {
        s.render = s.snake.map((seg, i) => s.render[i] || { ...seg })
      }
      s.render = s.snake.map((seg, i) => {
        const r = s.render[i] || seg
        return {
          x: r.x + (seg.x - r.x) * 0.35,
          y: r.y + (seg.y - r.y) * 0.35,
        }
      })

      ctx.clearRect(0, 0, size, size)

      // фон доски — стеклянная плашка чуть темнее карточки
      ctx.fillStyle = theme.scheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
      roundRect(ctx, 0, 0, size, size, 18)
      ctx.fill()

      // яблоко
      const apple = s.apple
      const ax = apple.x * cell + cell / 2
      const ay = apple.y * cell + cell / 2
      const appleR = cell * 0.32
      const appleGrad = ctx.createRadialGradient(ax - appleR * 0.3, ay - appleR * 0.3, 1, ax, ay, appleR)
      appleGrad.addColorStop(0, '#FF7A6E')
      appleGrad.addColorStop(1, '#E4433A')
      ctx.fillStyle = appleGrad
      ctx.beginPath()
      ctx.arc(ax, ay, appleR, 0, Math.PI * 2)
      ctx.fill()
      // листик
      ctx.fillStyle = '#57C168'
      ctx.beginPath()
      ctx.ellipse(ax + appleR * 0.35, ay - appleR * 1.0, appleR * 0.32, appleR * 0.16, -0.6, 0, Math.PI * 2)
      ctx.fill()

      // змейка — глянцевые закруглённые сегменты
      const render = s.render
      for (let i = render.length - 1; i >= 0; i--) {
        const seg = render[i]
        const px = seg.x * cell + cell / 2
        const py = seg.y * cell + cell / 2
        const isHead = i === 0
        const r = isHead ? cell * 0.46 : cell * 0.42 * (1 - i / (render.length * 2.6))

        const grad = ctx.createLinearGradient(px - r, py - r, px + r, py + r)
        if (isHead) {
          grad.addColorStop(0, '#6FE08A')
          grad.addColorStop(1, theme.accent)
        } else {
          grad.addColorStop(0, theme.accent)
          grad.addColorStop(1, 'rgba(94, 92, 230, 0.75)')
        }

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(px, py, Math.max(r, cell * 0.18), 0, Math.PI * 2)
        ctx.fill()

        if (isHead) {
          // глазки
          const eyeOffset = cell * 0.14
          const dirX = s.dir.x
          const dirY = s.dir.y
          const perpX = -dirY
          const perpY = dirX
          ctx.fillStyle = '#0B1A2A'
          for (const side of [-1, 1]) {
            const ex = px + dirX * cell * 0.16 + perpX * eyeOffset * side
            const ey = py + dirY * cell * 0.16 + perpY * eyeOffset * side
            ctx.beginPath()
            ctx.arc(ex, ey, cell * 0.06, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [theme])

  // Управление клавиатурой
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowUp' || e.key === 'w') setDirection(0, -1)
      else if (e.key === 'ArrowDown' || e.key === 's') setDirection(0, 1)
      else if (e.key === 'ArrowLeft' || e.key === 'a') setDirection(-1, 0)
      else if (e.key === 'ArrowRight' || e.key === 'd') setDirection(1, 0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setDirection])

  // Управление свайпом
  const touchStart = useRef(null)
  function onTouchStart(e) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e) {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? 1 : -1, 0)
    } else {
      setDirection(0, dy > 0 ? 1 : -1)
    }
    touchStart.current = null
  }

  return (
    <div className="card snake-card">
      <div className="notes-card__header">
        <div className="card__label">Змейка</div>
        <div className="snake-scores">
          <span className={`snake-scores__current ${bump ? 'is-bump' : ''}`}>{score}</span>
          <span className="snake-scores__best">лучший: {best}</span>
        </div>
      </div>

      <div
        className="snake-board-wrap"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas ref={canvasRef} className="snake-board" />

        {status !== 'playing' && (
          <div className="snake-overlay">
            <div className="snake-overlay__title">
              {status === 'idle' ? 'Змейка' : 'Игра окончена'}
            </div>
            {status === 'over' && <div className="snake-overlay__score">Счёт: {score}</div>}
            <button className="snake-overlay__btn" onClick={reset}>
              {status === 'idle' ? 'Играть' : 'Ещё раз'}
            </button>
          </div>
        )}
      </div>

      {status === 'playing' && (
        <div className="snake-dpad">
          <div className="snake-dpad__row">
            <button className="snake-dpad__btn" onClick={() => setDirection(0, -1)}>▲</button>
          </div>
          <div className="snake-dpad__row">
            <button className="snake-dpad__btn" onClick={() => setDirection(-1, 0)}>◀</button>
            <button className="snake-dpad__btn" onClick={() => setDirection(0, 1)}>▼</button>
            <button className="snake-dpad__btn" onClick={() => setDirection(1, 0)}>▶</button>
          </div>
        </div>
      )}
    </div>
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
