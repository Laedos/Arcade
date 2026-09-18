import { BALL_RADIUS, type BreakerState, PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_Y, WORLD_HEIGHT, WORLD_WIDTH } from './game'

export interface Viewport {
  scale: number
  offsetX: number
  offsetY: number
  width: number
  height: number
}

const FONT = '"Space Grotesk", system-ui, sans-serif'
const HUD_HEIGHT = 44

export function fitViewport(width: number, height: number): Viewport {
  const scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT)
  return { scale, width, height, offsetX: (width - WORLD_WIDTH * scale) / 2, offsetY: (height - WORLD_HEIGHT * scale) / 2 }
}

export function toWorldX(clientX: number, canvasLeft: number, pixelRatio: number, view: Viewport): number {
  return ((clientX - canvasLeft) * pixelRatio - view.offsetX) / view.scale
}

export function draw(ctx: CanvasRenderingContext2D, state: BreakerState, view: Viewport, best: number): void {
  ctx.fillStyle = '#070b1a'
  ctx.fillRect(0, 0, view.width, view.height)

  ctx.save()
  ctx.translate(view.offsetX, view.offsetY)
  ctx.scale(view.scale, view.scale)
  const field = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT)
  field.addColorStop(0, '#111a3d')
  field.addColorStop(1, '#0b1026')
  ctx.fillStyle = field
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

  for (const brick of state.bricks) {
    if (!brick.alive) continue
    const hue = (brick.row * 38 + 340) % 360
    ctx.fillStyle = `hsl(${hue} 80% 60%)`
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height)
    ctx.fillStyle = `hsl(${hue} 90% 75%)`
    ctx.fillRect(brick.x, brick.y, brick.width, 3)
  }

  ctx.fillStyle = '#78ffd6'
  ctx.beginPath()
  ctx.roundRect(state.paddleX - PADDLE_WIDTH / 2, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT, 6)
  ctx.fill()

  if (state.phase !== 'over') {
    ctx.fillStyle = '#fff6c2'
    ctx.beginPath()
    ctx.arc(state.ball.x, state.ball.y, BALL_RADIUS, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.textBaseline = 'middle'
  ctx.font = `600 16px ${FONT}`
  ctx.fillStyle = '#eef1ff'
  ctx.textAlign = 'left'
  ctx.fillText(`Score ${state.score}`, 14, HUD_HEIGHT / 2)
  ctx.textAlign = 'center'
  ctx.fillText(`Level ${state.level}`, WORLD_WIDTH / 2, HUD_HEIGHT / 2)
  ctx.textAlign = 'right'
  ctx.fillText(`${'●'.repeat(Math.max(0, state.lives))}  Best ${best}`, WORLD_WIDTH - 14, HUD_HEIGHT / 2)

  if (state.phase === 'ready') {
    banner(ctx, state.score === 0 && state.level === 1 ? 'BRICK BREAKER' : `LEVEL ${state.level}`, 'Tap, click or press Space to launch')
  } else if (state.phase === 'over') {
    banner(ctx, 'GAME OVER', `Score ${state.score} · tap to play again`)
  }
  ctx.restore()
}

function banner(ctx: CanvasRenderingContext2D, title: string, subtitle: string): void {
  const y = WORLD_HEIGHT * 0.62
  ctx.textAlign = 'center'
  ctx.fillStyle = '#eef1ff'
  ctx.font = `700 32px ${FONT}`
  ctx.fillText(title, WORLD_WIDTH / 2, y)
  ctx.fillStyle = 'rgba(238, 241, 255, 0.7)'
  ctx.font = `500 15px ${FONT}`
  ctx.fillText(subtitle, WORLD_WIDTH / 2, y + 34)
}
