// Вычисляет позицию "небесного тела" на дуге неба в зависимости от часа.
// Условно: восход в 6:00, закат в 20:00 — солнце идёт по дуге сверху.
// Ночью — луна идёт по своей дуге.
function getCelestialPosition(hours, minutes) {
  const t = hours + minutes / 60

  const sunrise = 6
  const sunset = 20

  const isDay = t >= sunrise && t < sunset

  let progress // 0..1 вдоль дуги
  let body

  if (isDay) {
    progress = (t - sunrise) / (sunset - sunrise)
    body = 'sun'
  } else {
    // ночная дуга: от заката до восхода следующего дня
    const nightLength = 24 - (sunset - sunrise)
    let sinceSunset = t - sunset
    if (sinceSunset < 0) sinceSunset += 24
    progress = sinceSunset / nightLength
    body = 'moon'
  }

  // Дуга: x от 5% до 95%, y — параболой (низко у горизонта, высоко в зените)
  const x = 5 + progress * 90
  const arcHeight = Math.sin(progress * Math.PI) // 0 у горизонта, 1 в зените
  const y = 82 - arcHeight * 62

  return { body, x, y, progress }
}

export default function SkyBody({ now }) {
  const { body, x, y } = getCelestialPosition(now.getHours(), now.getMinutes())

  return (
    <svg className="sky-body" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {body === 'sun' ? (
        <g style={{ transform: `translate(${x}px, ${y}px)`, transformBox: 'fill-box', transformOrigin: 'center' }}>
          <circle r="4.5" fill="url(#sunGrad)" />
        </g>
      ) : (
        <g style={{ transform: `translate(${x}px, ${y}px)`, transformBox: 'fill-box', transformOrigin: 'center' }}>
          <circle r="3.4" fill="url(#moonGrad)" />
        </g>
      )}
      <defs>
        <radialGradient id="sunGrad">
          <stop offset="0%" stopColor="#FFF6D8" />
          <stop offset="60%" stopColor="#FFD76A" />
          <stop offset="100%" stopColor="#FFB74D" stopOpacity="0.4" />
        </radialGradient>
        <radialGradient id="moonGrad">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#DCE3F5" />
          <stop offset="100%" stopColor="#B8C2E0" stopOpacity="0.5" />
        </radialGradient>
      </defs>
    </svg>
  )
}
