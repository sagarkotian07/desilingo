import type { Season } from './season'

/**
 * The seasonal backdrop: cherry blossom petals in spring, snow in winter.
 *
 * One full-viewport canvas behind the page, plain DOM and canvas with no
 * React in it, so a single effect can start and stop it. Velocities are in
 * CSS pixels per second and every frame scales by real elapsed time, so a
 * 120 Hz phone and a throttled laptop fall at the same speed.
 */

interface Particle {
  x: number
  y: number
  size: number
  /** Fall speed. */
  vy: number
  /** How far the sideways sway reaches. */
  drift: number
  phase: number
  spin: number
  rot: number
  tint: number
}

const PETAL_TINTS = ['#f9c9d6', '#f6b3c6', '#fbdbe3', '#f29fb8']
/** A slow breeze so petals cross the page rather than fall straight down. */
const BREEZE = 14
const DPR_CAP = 2

const rand = (min: number, max: number) => min + Math.random() * (max - min)

function spawn(w: number, h: number, season: Season, fromTop: boolean): Particle {
  const size = season === 'spring' ? rand(6, 14) : rand(1, 4)
  return {
    x: rand(-20, w + 20),
    y: fromTop ? rand(-60, -10) : rand(-20, h),
    size,
    // Bigger falls faster: a cheap parallax that reads as depth.
    vy: season === 'spring' ? rand(26, 50) + size * 2.5 : rand(16, 36) + size * 12,
    drift: season === 'spring' ? rand(16, 40) : rand(4, 14),
    phase: rand(0, Math.PI * 2),
    spin: season === 'spring' ? rand(-1.6, 1.6) : 0,
    rot: rand(0, Math.PI * 2),
    tint: Math.floor(rand(0, PETAL_TINTS.length)),
  }
}

/** How many particles a viewport of this size gets. */
function population(w: number, h: number, season: Season): number {
  return season === 'spring' ? Math.min(90, Math.round((w * h) / 13000)) : Math.min(120, Math.round((w * h) / 11000))
}

function drawPetal(ctx: CanvasRenderingContext2D, p: Particle, t: number) {
  const s = p.size
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  // Tumbling: the petal's apparent width breathes as it turns edge-on.
  ctx.scale(0.45 + 0.55 * Math.abs(Math.sin(t * 1.7 + p.phase)), 1)
  ctx.beginPath()
  // The notch at the tip is what makes a sakura petal read as sakura.
  ctx.moveTo(0, -s * 0.55)
  ctx.bezierCurveTo(s * 0.35, -s * 1.05, s * 1.05, -s * 0.2, 0, s)
  ctx.bezierCurveTo(-s * 1.05, -s * 0.2, -s * 0.35, -s * 1.05, 0, -s * 0.55)
  ctx.fillStyle = PETAL_TINTS[p.tint]
  ctx.globalAlpha = 0.92
  ctx.fill()
  ctx.restore()
}

function drawFlake(ctx: CanvasRenderingContext2D, p: Particle) {
  // Far flakes are small and faint, near ones big and bright: the same depth
  // cue as the fall speed, and what keeps this from reading as a starfield.
  const near = (p.size - 1) / 3
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
  ctx.fillStyle = `rgb(255 255 255 / ${(0.3 + 0.55 * near).toFixed(2)})`
  ctx.fill()
  if (p.size > 2.5) {
    // A soft halo on the near flakes, without the cost of shadowBlur.
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgb(200 220 255 / 0.1)'
    ctx.fill()
  }
}

/**
 * Starts the backdrop on `canvas` and returns a function that stops it.
 * With `animate` false it draws one still frame, for reduced motion.
 */
export function startSeason(canvas: HTMLCanvasElement, season: Season, animate: boolean): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  let w = 0
  let h = 0
  const particles: Particle[] = []

  function resize() {
    const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1)
    w = window.innerWidth
    h = window.innerHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    const target = population(w, h, season)
    while (particles.length < target) particles.push(spawn(w, h, season, false))
    particles.length = Math.min(particles.length, target)
  }

  function frame(t: number, dt: number) {
    ctx!.clearRect(0, 0, w, h)
    for (const p of particles) {
      p.y += p.vy * dt
      p.x += (BREEZE + Math.sin(t * 0.8 + p.phase) * p.drift) * dt
      p.rot += p.spin * dt
      if (p.y > h + 20 || p.x > w + 40) Object.assign(p, spawn(w, h, season, true))
      if (season === 'spring') drawPetal(ctx!, p, t)
      else drawFlake(ctx!, p)
    }
  }

  resize()
  window.addEventListener('resize', resize)
  if (!animate) {
    frame(0, 0)
    return () => window.removeEventListener('resize', resize)
  }

  let raf = 0
  let last = 0
  const tick = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
    last = now
    frame(now / 1000, dt)
    raf = requestAnimationFrame(tick)
  }
  // No point drawing a tab nobody can see; and on return, don't leap ahead.
  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0 }
    else if (!raf) { last = 0; raf = requestAnimationFrame(tick) }
  }
  document.addEventListener('visibilitychange', onVisibility)
  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
