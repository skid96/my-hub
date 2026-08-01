import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'

const WALL_COLOR = 0x2a3550
const FLOOR_COLOR = 0x1a2138
const TARGET_COLOR = 0xff5a4e
const TARGET_HIT_COLOR = 0x57c168

// Простая карта: стены как отрезки {x1,z1,x2,z2}
const MAP_SIZE = 24
const WALLS = [
  // внешние границы
  { x1: -MAP_SIZE, z1: -MAP_SIZE, x2: MAP_SIZE, z2: -MAP_SIZE },
  { x1: -MAP_SIZE, z1: MAP_SIZE, x2: MAP_SIZE, z2: MAP_SIZE },
  { x1: -MAP_SIZE, z1: -MAP_SIZE, x2: -MAP_SIZE, z2: MAP_SIZE },
  { x1: MAP_SIZE, z1: -MAP_SIZE, x2: MAP_SIZE, z2: MAP_SIZE },
  // внутренние перегородки — простая арена
  { x1: -10, z1: -10, x2: -10, z2: 5 },
  { x1: -10, z1: 5, x2: 2, z2: 5 },
  { x1: 6, z1: -14, x2: 6, z2: -2 },
  { x1: 6, z1: -2, x2: 16, z2: -2 },
  { x1: -4, z1: 10, x2: 12, z2: 10 },
]

function playShotSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.1)
    setTimeout(() => ctx.close(), 200)
  } catch {
    // ignore
  }
}

function playHitSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.1)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.15)
    setTimeout(() => ctx.close(), 250)
  } catch {
    // ignore
  }
}

export default function ShooterRange() {
  const mountRef = useRef(null)
  const [active, setActive] = useState(false)
  const [score, setScore] = useState(0)
  const [ammo, setAmmo] = useState(30)
  const [timeLeft, setTimeLeft] = useState(60)
  const [ended, setEnded] = useState(false)

  const engineRef = useRef(null)

  const startGame = useCallback(() => {
    setScore(0)
    setAmmo(30)
    setTimeLeft(60)
    setEnded(false)
    setActive(true)
  }, [])

  useEffect(() => {
    if (!active) return
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1130)
    scene.fog = new THREE.Fog(0x0b1130, 15, 60)

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 200)
    camera.position.set(0, 1.6, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0x8899ff, 0.5)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(10, 20, 10)
    scene.add(dir)

    const floorGeo = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2)
    const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)

    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0e1530, roughness: 1 })
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat)
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.y = 5
    scene.add(ceiling)

    const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.7 })
    const collidersXZ = []
    WALLS.forEach((w) => {
      const dx = w.x2 - w.x1
      const dz = w.z2 - w.z1
      const length = Math.sqrt(dx * dx + dz * dz)
      const thickness = 0.4
      const geo = new THREE.BoxGeometry(length, 4, thickness)
      const mesh = new THREE.Mesh(geo, wallMat)
      mesh.position.set((w.x1 + w.x2) / 2, 2, (w.z1 + w.z2) / 2)
      mesh.rotation.y = -Math.atan2(dz, dx)
      scene.add(mesh)

      const pad = thickness / 2 + 0.3
      collidersXZ.push({
        minX: Math.min(w.x1, w.x2) - (dz === 0 ? 0 : pad),
        maxX: Math.max(w.x1, w.x2) + (dz === 0 ? 0 : pad),
        minZ: Math.min(w.z1, w.z2) - (dx === 0 ? 0 : pad),
        maxZ: Math.max(w.z1, w.z2) + (dx === 0 ? 0 : pad),
      })
    })

    const targets = []
    function spawnTarget() {
      const geo = new THREE.SphereGeometry(0.55, 20, 20)
      const mat = new THREE.MeshStandardMaterial({ color: TARGET_COLOR, roughness: 0.4, metalness: 0.1 })
      const mesh = new THREE.Mesh(geo, mat)
      let pos
      let attempts = 0
      do {
        pos = new THREE.Vector3(
          (Math.random() - 0.5) * (MAP_SIZE * 1.6),
          1.2 + Math.random() * 1.2,
          (Math.random() - 0.5) * (MAP_SIZE * 1.6)
        )
        attempts++
      } while (attempts < 20 && collidersXZ.some((c) => pos.x > c.minX - 1 && pos.x < c.maxX + 1 && pos.z > c.minZ - 1 && pos.z < c.maxZ + 1))
      mesh.position.copy(pos)
      scene.add(mesh)
      targets.push(mesh)
    }
    for (let i = 0; i < 8; i++) spawnTarget()

    const player = { x: 0, z: 8, yaw: Math.PI, pitch: 0 }

    function collides(x, z) {
      const r = 0.4
      return collidersXZ.some((c) => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ)
    }

    const keys = {}
    function onKeyDown(e) { keys[e.code] = true }
    function onKeyUp(e) { keys[e.code] = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    function onMouseMove(e) {
      if (document.pointerLockElement !== renderer.domElement) return
      player.yaw -= e.movementX * 0.0025
      player.pitch -= e.movementY * 0.0025
      player.pitch = Math.max(-1.2, Math.min(1.2, player.pitch))
    }
    function onCanvasClick() {
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock?.()
      }
    }
    renderer.domElement.addEventListener('click', onCanvasClick)
    document.addEventListener('mousemove', onMouseMove)

    let touchLook = null
    function onTouchStart(e) {
      if (e.touches.length === 1) {
        touchLook = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
    function onTouchMove(e) {
      if (!touchLook || e.touches.length !== 1) return
      const t = e.touches[0]
      const dx = t.clientX - touchLook.x
      const dy = t.clientY - touchLook.y
      player.yaw -= dx * 0.004
      player.pitch -= dy * 0.004
      player.pitch = Math.max(-1.2, Math.min(1.2, player.pitch))
      touchLook = { x: t.clientX, y: t.clientY }
    }
    function onTouchEnd() { touchLook = null }
    renderer.domElement.addEventListener('touchstart', onTouchStart)
    renderer.domElement.addEventListener('touchmove', onTouchMove)
    renderer.domElement.addEventListener('touchend', onTouchEnd)

    const raycaster = new THREE.Raycaster()
    function shoot() {
      setAmmo((a) => {
        if (a <= 0) return a
        raycaster.set(camera.position, camera.getWorldDirection(new THREE.Vector3()))
        const hits = raycaster.intersectObjects(targets)
        playShotSound()
        if (hits.length > 0) {
          const hit = hits[0].object
          hit.material.color.setHex(TARGET_HIT_COLOR)
          playHitSound()
          setScore((s) => s + 1)
          setTimeout(() => {
            scene.remove(hit)
            const idx = targets.indexOf(hit)
            if (idx >= 0) targets.splice(idx, 1)
            spawnTarget()
          }, 120)
        }
        return a - 1
      })
    }
    function onFireClick() {
      if (document.pointerLockElement === renderer.domElement) shoot()
    }
    renderer.domElement.addEventListener('mousedown', onFireClick)

    const moveState = { forward: false, back: false, left: false, right: false }
    engineRef.current = {
      shoot,
      setMove: (dir, val) => { moveState[dir] = val },
    }

    let raf
    let last = performance.now()
    function animate(now) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      const speed = 5
      const forward = (keys['KeyW'] || keys['ArrowUp'] || moveState.forward ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] || moveState.back ? 1 : 0)
      const strafe = (keys['KeyD'] || keys['ArrowRight'] || moveState.right ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] || moveState.left ? 1 : 0)

      const sinYaw = Math.sin(player.yaw)
      const cosYaw = Math.cos(player.yaw)
      const moveX = (-sinYaw * forward + cosYaw * strafe) * speed * dt
      const moveZ = (-cosYaw * forward - sinYaw * strafe) * speed * dt

      const newX = player.x + moveX
      const newZ = player.z + moveZ
      if (!collides(newX, player.z)) player.x = newX
      if (!collides(player.x, newZ)) player.z = newZ

      camera.position.set(player.x, 1.6, player.z)
      camera.rotation.order = 'YXZ'
      camera.rotation.y = player.yaw
      camera.rotation.x = player.pitch

      targets.forEach((t) => { t.rotation.y += dt * 0.6 })

      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    function onResize() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('click', onCanvasClick)
      renderer.domElement.removeEventListener('mousedown', onFireClick)
      renderer.domElement.removeEventListener('touchstart', onTouchStart)
      renderer.domElement.removeEventListener('touchmove', onTouchMove)
      renderer.domElement.removeEventListener('touchend', onTouchEnd)
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock?.()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [active])

  useEffect(() => {
    if (!active || ended) return
    if (timeLeft <= 0) {
      setEnded(true)
      setActive(false)
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [active, ended, timeLeft])

  useEffect(() => {
    if (ammo <= 0 && active) {
      const id = setTimeout(() => {
        setEnded(true)
        setActive(false)
      }, 600)
      return () => clearTimeout(id)
    }
  }, [ammo, active])

  function touchMove(dir, val) {
    engineRef.current?.setMove(dir, val)
  }
  function touchShoot() {
    engineRef.current?.shoot()
  }

  return (
    <div className="card shooter-card">
      <div className="notes-card__header">
        <div className="card__label">Тир</div>
        {active && (
          <div className="shooter-hud">
            <span>🎯 {score}</span>
            <span>🔫 {ammo}</span>
            <span>⏱ {timeLeft}с</span>
          </div>
        )}
      </div>

      <div className="shooter-viewport">
        {active && <div ref={mountRef} className="shooter-canvas-mount" />}

        {active && (
          <>
            <div className="shooter-crosshair" />
            <div className="shooter-touch-controls">
              <div className="shooter-joystick">
                <button className="shooter-joy-btn" style={{ gridArea: 'up' }}
                  onTouchStart={() => touchMove('forward', true)} onTouchEnd={() => touchMove('forward', false)}>▲</button>
                <button className="shooter-joy-btn" style={{ gridArea: 'left' }}
                  onTouchStart={() => touchMove('left', true)} onTouchEnd={() => touchMove('left', false)}>◀</button>
                <button className="shooter-joy-btn" style={{ gridArea: 'right' }}
                  onTouchStart={() => touchMove('right', true)} onTouchEnd={() => touchMove('right', false)}>▶</button>
                <button className="shooter-joy-btn" style={{ gridArea: 'down' }}
                  onTouchStart={() => touchMove('back', true)} onTouchEnd={() => touchMove('back', false)}>▼</button>
              </div>
              <button className="shooter-fire-btn" onTouchStart={touchShoot}>●</button>
            </div>
          </>
        )}

        {!active && (
          <div className="snake-overlay">
            <div className="snake-overlay__title">{ended ? 'Раунд окончен' : 'Тир'}</div>
            {ended && <div className="snake-overlay__score">Попаданий: {score}</div>}
            {!ended && (
              <div className="shooter-help">
                На компьютере: мышь — прицел, клик — выстрел, WASD — движение.<br />
                На телефоне: палец по экрану — прицел, джойстик снизу — движение, круглая кнопка — огонь.
              </div>
            )}
            <button className="snake-overlay__btn" onClick={startGame}>
              {ended ? 'Ещё раз' : 'Начать'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
