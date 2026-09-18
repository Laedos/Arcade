import { type GameState, type Planet, VIEW_HEIGHT, WORLD_WIDTH } from './game'

export interface Viewport {
  scale: number
  offsetX: number
  offsetY: number
  width: number
  height: number
}

const COLORS = {
  spaceTop: '#0b1026',
  spaceBottom: '#1a0f2e',
  star: '#c9d4ff',
  orbit: 'rgba(160, 180, 255, 0.28)',
  orbitActive: 'rgba(120, 255, 214, 0.8)',
  player: '#fff6c2',
  playerGlow: 'rgba(255, 220, 120, 0.55)',
  trail: 'rgba(255, 220, 120, ',
  text: '#eef1ff',
  textMuted: 'rgba(238, 241, 255, 0.65)',
  gain: '#78ffd6',
}

const PLANET_HUES = [18, 200, 280, 140, 330, 45]
const STAR_CELL = 90
const GAIN_POP_SECONDS = 0.9

export function fitViewport(width: number, height: number): Viewport {
  const scale = Math.min(width / WORLD_WIDTH, height / VIEW_HEIGHT)
  return { scale, width, height, offsetX: (width - WORLD_WIDTH * scale) / 2, offsetY: (height - VIEW_HEIGHT * scale) / 2 }
}

export function draw(ctx: CanvasRenderingContext2D, state: GameState, view: Viewport, best: number): void {
  const background = ctx.createLinearGradient(0, 0, 0, view.height)
  background.addColorStop(0, COLORS.spaceTop)
  background.addColorStop(1, COLORS.spaceBottom)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, view.width, view.height)

  ctx.save()
  ctx.translate(view.offsetX, view.offsetY)
  ctx.scale(view.scale, view.scale)
  ctx.beginPath()
  ctx.rect(0, 0, WORLD_WIDTH, VIEW_HEIGHT)
  ctx.clip()

  drawStars(ctx, state.cameraY)
  ctx.translate(0, -state.cameraY)
  for (const planet of state.planets) drawPlanet(ctx, planet, planet.id === state.currentId && state.phase !== 'flying')
  drawPlayer(ctx, state)
  ctx.restore()

  drawHud(ctx, state, view, best)
}

function drawStars(ctx: CanvasRenderingContext2D, cameraY: number): void {
  // Half-speed parallax; each grid cell's star comes from a hash of the cell, so the field is
  // stable across frames without storing it.
  const parallaxY = cameraY * 0.5
  const firstRow = Math.floor(parallaxY / STAR_CELL)
  ctx.fillStyle = COLORS.star
  for (let row = firstRow; row <= firstRow + Math.ceil(VIEW_HEIGHT / STAR_CELL) + 1; row++) {
    for (let col = 0; col < Math.ceil(WORLD_WIDTH / STAR_CELL); col++) {
      for (let k = 0; k < 3; k++) {
        const h = hash(row * 7919 + col * 104729 + k * 1299709)
        const x = col * STAR_CELL + (h % STAR_CELL)
        const y = row * STAR_CELL + ((h >>> 8) % STAR_CELL) - parallaxY
        ctx.globalAlpha = 0.25 + ((h >>> 16) % 60) / 100
        ctx.fillRect(x, y, 1.6, 1.6)
      }
    }
  }
  ctx.globalAlpha = 1
}

function drawPlanet(ctx: CanvasRenderingContext2D, planet: Planet, active: boolean): void {
  ctx.setLineDash(active ? [] : [4, 7])
  ctx.lineWidth = active ? 2 : 1.5
  ctx.strokeStyle = active ? COLORS.orbitActive : COLORS.orbit
  ctx.beginPath()
  ctx.arc(planet.x, planet.y, planet.orbit, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  const hue = PLANET_HUES[planet.id % PLANET_HUES.length]
  const body = ctx.createRadialGradient(planet.x - planet.radius * 0.35, planet.y - planet.radius * 0.35, planet.radius * 0.1, planet.x, planet.y, planet.radius)
  body.addColorStop(0, `hsl(${hue} 85% 72%)`)
  body.addColorStop(1, `hsl(${hue} 60% 38%)`)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
  state.trail.forEach((point, i) => {
    const t = (i + 1) / state.trail.length
    ctx.fillStyle = `${COLORS.trail}${t * 0.6})`
    ctx.beginPath()
    ctx.arc(point.x, point.y, 2 + t * 3, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.fillStyle = COLORS.playerGlow
  ctx.beginPath()
  ctx.arc(state.pos.x, state.pos.y, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = COLORS.player
  ctx.beginPath()
  ctx.arc(state.pos.x, state.pos.y, 6, 0, Math.PI * 2)
  ctx.fill()
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState, view: Viewport, best: number): void {
  const unit = view.scale
  const centerX = view.width / 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  ctx.fillStyle = COLORS.text
  ctx.font = `700 ${44 * unit}px "Space Grotesk", system-ui, sans-serif`
  ctx.fillText(String(state.score), centerX, view.offsetY + 24 * unit)
  ctx.fillStyle = COLORS.textMuted
  ctx.font = `500 ${14 * unit}px "Space Grotesk", system-ui, sans-serif`
  ctx.fillText(`BEST ${best}`, centerX, view.offsetY + 76 * unit)

  const sinceGain = state.time - state.lastGainAt
  if (state.lastGain > 1 && sinceGain < GAIN_POP_SECONDS) {
    ctx.globalAlpha = 1 - sinceGain / GAIN_POP_SECONDS
    ctx.fillStyle = COLORS.gain
    ctx.font = `700 ${22 * unit}px "Space Grotesk", system-ui, sans-serif`
    ctx.fillText(`+${state.lastGain} SKIP!`, centerX, view.offsetY + (104 - sinceGain * 20) * unit)
    ctx.globalAlpha = 1
  }

  if (state.phase === 'ready') {
    banner(ctx, view, 'SLINGWELL', 'Tap, click or press Space to let go')
  } else if (state.phase === 'over') {
    banner(ctx, view, 'LOST IN SPACE', `Score ${state.score} · tap to fly again`)
  }
}

function banner(ctx: CanvasRenderingContext2D, view: Viewport, title: string, subtitle: string): void {
  const unit = view.scale
  const y = view.offsetY + VIEW_HEIGHT * 0.72 * unit
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = COLORS.text
  ctx.font = `700 ${34 * unit}px "Space Grotesk", system-ui, sans-serif`
  ctx.fillText(title, view.width / 2, y)
  ctx.fillStyle = COLORS.textMuted
  ctx.font = `500 ${15 * unit}px "Space Grotesk", system-ui, sans-serif`
  ctx.fillText(subtitle, view.width / 2, y + 36 * unit)
}

function hash(n: number): number {
  let h = n | 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  return (h ^ (h >>> 16)) >>> 0
}
