import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'

const WALL_COLOR = 0x2a3550
const FLOOR_COLOR = 0x1a2138
const TARGET_COLOR = 0xff5a4e
const TARGET_HIT_COLOR = 0x57c168

const MAP_SIZE = 20
const WALLS = [
  { x1: -MAP_SIZE, z1: -MAP_SIZE, x2: MAP_SIZE, z2: -MAP_SIZE },
  { x1: -MAP_SIZE, z1: MAP_SIZE, x2: MAP_SIZE, z2: MAP_SIZE },
  { x1: -MAP_SIZE, z1: -MAP_SIZE, x2: -MAP_SIZE, z2: MAP_SIZE },
  { x1: MAP_SIZE, z1: -MAP_SIZE, x2: MAP_SIZE, z2: MAP_SIZE },
  { x1: -8, z1: -8, x2: -8, z2: 4 },
  { x1: -8, z1: 4, x2: 2, z2: 4 },
  { x1: 5, z1: -11, x2: 5, z2: -1 },
  { x1: 5, z1: -1, x2: 13, z2: -1 },
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
  } catch { /* ignore */ }
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
  } catch { /* ignore */ }
}

export default function ShooterRange() {
  const mountRef = useRef(null)
  const engineRef = useRef(null)
  const [active, setActive] = useState(false)
  const [score, setScore] = useState(0)
  const [ammo, setAmmo] = useState(20)
  const [timeLeft, setTimeLeft] = useState(45)
  const [ended, setEnded] = useState(false)
  const [error, setError] = useState(false)

  const startGame = useCallback(() => {
    setScore(0)
    setAmmo(20)
    setTimeLeft(45)
    setEnded(false)
    setError(false)
    setActive(true)
  }, [])

  const stopGame = useCallback(() => {
    setActive(false)
  }, [])

  useEffect(() => {
    if (!active) return
    const mount = mountRef.current
    if (!mount) return

    let renderer
    try {
      const width = mount.clientWidth
      const height = mount.clientHeight

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0b1130)
      scene.fog = new THREE.Fog(0x0b1130, 12, 48)

      const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 150)
      camera.position.set(0, 1.6, 10)

      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      mount.appendChild(renderer.domElement)

      const ambient = new THREE.AmbientLight(0x8899ff, 0.55)
      scene.add(ambient)
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.85)
      dirLight.position.set(10, 20, 10)
      scene.add(dirLight)

      const floorGeo = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2)
      const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9 }))
      floor.rotation.x = -Math.PI / 2
      scene.add(floor)

      const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.7 })
      const colliders = []
      WALLS.forEach((w) => {
        const dx = w.x2 - w.x1
        const dz = w.z2 - w.z1
        const length = Math.sqrt(dx * dx + dz * dz)
        const thickness = 0.4
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, 3.4, thickness), wallMat)
        mesh.position.set((w.x1 + w.x2) / 2, 1.7, (w.z1 + w.z2) / 2)
        mesh.rotation.y = -Math.atan2(dz, dx)
        scene.add(mesh)
        const pad = thickness / 2 + 0.35
        colliders.push({
          minX: Math.min(w.x1, w.x2) - (dz === 0 ? 0 : pad),
          maxX: Math.max(w.x1, w.x2) + (dz === 0 ? 0 : pad),
          minZ: Math.min(w.z1, w.z2) - (dx === 0 ? 0 : pad),
          maxZ: Math.max(w.z1, w.z2) + (dx === 0 ? 0 : pad),
        })
      })

      const targets = []
      function spawnTarget() {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 16, 16),
          new THREE.MeshStandardMaterial({ color: TARGET_COLOR, roughness: 0.4 })
        )
        let pos, attempts = 0
        do {
          pos = new THREE.Vector3(
            (Math.random() - 0.5) * (MAP_SIZE * 1.5),
            1.1 + Math.random(),
            (Math.random() - 0.5) * (MAP_SIZE * 1.5)
          )
          attempts++
        } while (attempts < 15 && colliders.some((c) => pos.x > c.minX - 1 && pos.x < c.maxX + 1 && pos.z > c.minZ - 1 && pos.z < c.maxZ + 1))
        mesh.position.copy(pos)
        scene.add(mesh)
        targets.push(mesh)
      }
      for (let i = 0; i < 6; i++) spawnTarget()

      const player = { x: 0, z: 10, yaw: Math.PI, pitch: 0 }
      function collides(x, z) {
        const r = 0.4
        return colliders.some((c) => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ)
      }

      const keys = {}
      function onKeyDown(e) { keys[e.code] = true }
      function onKeyUp(e) { keys[e.code] = false }
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)

      // Взгляд: drag пальцем/мышью прямо по канвасу, без pointer lock (надёжнее на мобильном)
      let dragId = null
      let lastX = 0
      let lastY = 0
      function onPointerDown(e) {
        dragId = e.pointerId
        lastX = e.clientX
        lastY = e.clientY
        renderer.domElement.setPointerCapture?.(dragId)
      }
      function onPointerMove(e) {
        if (dragId === null || e.pointerId !== dragId) return
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        lastX = e.clientX
        lastY = e.clientY
        player.yaw -= dx * 0.0045
        player.pitch -= dy * 0.0045
        player.pitch = Math.max(-1.1, Math.min(1.1, player.pitch))
      }
      function onPointerUp(e) {
        if (e.pointerId === dragId) dragId = null
      }
      renderer.domElement.style.touchAction = 'none'
      renderer.domElement.addEventListener('pointerdown', onPointerDown)
      renderer.domElement.addEventListener('pointermove', onPointerMove)
      renderer.domElement.addEventListener('pointerup', onPointerUp)
      renderer.domElement.addEventListener('pointercancel', onPointerUp)

      const raycaster = new THREE.Raycaster()
      function shoot() {
        setAmmo((a) => {
          if (a <= 0) return a
          const dir = new THREE.Vector3()
          camera.getWorldDirection(dir)
          raycaster.set(camera.position, dir)
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
            }, 100)
          }
          return a - 1
        })
      }

      const moveState = { forward: false, back: false, left: false, right: false }
      engineRef.current = { shoot, setMove: (d, v) => { moveState[d] = v } }

      let raf
      let last = performance.now()
      function animate(now) {
        const dt = Math.min((now - last) / 1000, 0.05)
        last = now

        const speed = 4.5
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

        renderer.render(scene, camera)
        raf = requestAnimationFrame(animate)
      }
      raf = requestAnimationFrame(animate)

      function onResize() {
        const w = mount.clientWidth
        const h = mount.clientHeight
        if (w === 0 || h === 0) return
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
        window.removeEventListener('resize', onResize)
        renderer.domElement.removeEventListener('pointerdown', onPointerDown)
        renderer.domElement.removeEventListener('pointermove', onPointerMove)
        renderer.domElement.removeEventListener('pointerup', onPointerUp)
        renderer.domElement.removeEventListener('pointercancel', onPointerUp)
        renderer.dispose()
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      }
    } catch (e) {
      console.error('Shooter init failed', e)
      setError(true)
      setActive(false)
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
      }, 500)
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
        {active && (
          <div
            ref={mountRef}
            className="shooter-canvas-mount"
            onClick={touchShoot}
          />
        )}

        {active && (
          <>
            <div className="shooter-crosshair" />
            <button className="shooter-exit-btn" onClick={stopGame}>✕</button>
            <div className="shooter-touch-controls">
              <div className="shooter-joystick">
                <button className="shooter-joy-btn" style={{ gridArea: 'up' }}
                  onPointerDown={(e) => { e.stopPropagation(); touchMove('forward', true) }}
                  onPointerUp={() => touchMove('forward', false)}>▲</button>
                <button className="shooter-joy-btn" style={{ gridArea: 'left' }}
                  onPointerDown={(e) => { e.stopPropagation(); touchMove('left', true) }}
                  onPointerUp={() => touchMove('left', false)}>◀</button>
                <button className="shooter-joy-btn" style={{ gridArea: 'right' }}
                  onPointerDown={(e) => { e.stopPropagation(); touchMove('right', true) }}
                  onPointerUp={() => touchMove('right', false)}>▶</button>
                <button className="shooter-joy-btn" style={{ gridArea: 'down' }}
                  onPointerDown={(e) => { e.stopPropagation(); touchMove('back', true) }}
                  onPointerUp={() => touchMove('back', false)}>▼</button>
              </div>
              <button
                className="shooter-fire-btn"
                onPointerDown={(e) => { e.stopPropagation(); touchShoot() }}
              >●</button>
            </div>
          </>
        )}

        {!active && (
          <div className="snake-overlay">
            <div className="snake-overlay__title">
              {error ? 'Не удалось запустить 3D' : ended ? 'Раунд окончен' : 'Тир'}
            </div>
            {ended && !error && <div className="snake-overlay__score">Попаданий: {score}</div>}
            {error && (
              <div className="shooter-help">
                Похоже, браузер не поддерживает 3D-графику (WebGL) на этом устройстве.
              </div>
            )}
            {!ended && !error && (
              <div className="shooter-help">
                Джойстик слева-снизу — двигаться.<br />
                Проведи пальцем по экрану — прицел.<br />
                Красная кнопка или тап по экрану — выстрел.<br />
                Крестик сверху — выйти.
              </div>
            )}
            {!error && (
              <button className="snake-overlay__btn" onClick={startGame}>
                {ended ? 'Ещё раз' : 'Начать'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
