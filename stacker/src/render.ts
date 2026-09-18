import { BLOCK_HEIGHT, type Block, levelY, type StackerState, VIEW_HEIGHT, WORLD_WIDTH } from './game'

export interface Viewport {
  scale: number
  offsetX: number
  offsetY: number
  width: number
  height: number
}

const POP_SECONDS = 0.8
const FONT = '"Space Grotesk", system-ui, sans-serif'

export function fitViewport(width: number, height: number): Viewport {
  const scale = Math.min(width / WORLD_WIDTH, height / VIEW_HEIGHT)
  return { scale, width, height, offsetX: (width - WORLD_WIDTH * scale) / 2, offsetY: (height - VIEW_HEIGHT * scale) / 2 }
}

// Keeps the top of the stack at a fixed height on screen, never scrolling below the base.
export function cameraY(state: StackerState): number {
  return Math.min(levelY(state.stack.length) - VIEW_HEIGHT * 0.45, -VIEW_HEIGHT + BLOCK_HEIGHT * 3)
}

export function draw(ctx: CanvasRenderingContext2D, state: StackerState, view: Viewport, camera: number, best: number): void {
  const hueShift = state.stack.length * 4
  const background = ctx.createLinearGradient(0, 0, 0, view.height)
  background.addColorStop(0, `hsl(${230 + hueShift} 45% 14%)`)
  background.addColorStop(1, `hsl(${260 + hueShift} 40% 8%)`)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, view.width, view.height)

  ctx.save()
  ctx.translate(view.offsetX, view.offsetY)
  ctx.scale(view.scale, view.scale)
  ctx.beginPath()
  ctx.rect(0, 0, WORLD_WIDTH, VIEW_HEIGHT)
  ctx.clip()
  ctx.translate(0, -camera)

  state.stack.forEach((block, level) => drawBlock(ctx, block, level, levelY(level)))
  for (const piece of state.debris) {
    ctx.globalAlpha = 0.85
    drawBlock(ctx, piece, piece.level, piece.y)
  }
  ctx.globalAlpha = 1
  if (state.phase !== 'over') drawBlock(ctx, state.moving, state.stack.length, levelY(state.stack.length))
  ctx.restore()

  drawHud(ctx, state, view, best)
}

function drawBlock(ctx: CanvasRenderingContext2D, block: Block, level: number, y: number): void {
  const hue = (level * 11) % 360
  ctx.fillStyle = `hsl(${hue} 75% 58%)`
  ctx.fillRect(block.x, y - BLOCK_HEIGHT, block.width, BLOCK_HEIGHT)
  ctx.fillStyle = `hsl(${hue} 80% 72%)`
  ctx.fillRect(block.x, y - BLOCK_HEIGHT, block.width, 4)
  ctx.fillStyle = `hsl(${hue} 60% 38%)`
  ctx.fillRect(block.x, y - 3, block.width, 3)
}

function drawHud(ctx: CanvasRenderingContext2D, state: StackerState, view: Viewport, best: number): void {
  const unit = view.scale
  const centerX = view.width / 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#eef1ff'
  ctx.font = `700 ${44 * unit}px ${FONT}`
  ctx.fillText(String(state.score), centerX, view.offsetY + 24 * unit)
  ctx.fillStyle = 'rgba(238, 241, 255, 0.65)'
  ctx.font = `500 ${14 * unit}px ${FONT}`
  ctx.fillText(`BEST ${best}`, centerX, view.offsetY + 76 * unit)

  const since = state.time - state.lastDropAt
  if (state.lastDrop === 'perfect' && since < POP_SECONDS) {
    ctx.globalAlpha = 1 - since / POP_SECONDS
    ctx.fillStyle = '#78ffd6'
    ctx.font = `700 ${22 * unit}px ${FONT}`
    ctx.fillText(state.combo > 1 ? `PERFECT x${state.combo}` : 'PERFECT', centerX, view.offsetY + (104 - since * 20) * unit)
    ctx.globalAlpha = 1
  }

  if (state.phase === 'ready') {
    banner(ctx, view, 'STACKER', 'Tap, click or press Space to drop')
  } else if (state.phase === 'over') {
    banner(ctx, view, 'TOPPLED', `Height ${state.score} · tap to build again`)
  }
}

function banner(ctx: CanvasRenderingContext2D, view: Viewport, title: string, subtitle: string): void {
  const unit = view.scale
  const y = view.offsetY + VIEW_HEIGHT * 0.3 * unit
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#eef1ff'
  ctx.font = `700 ${34 * unit}px ${FONT}`
  ctx.fillText(title, view.width / 2, y)
  ctx.fillStyle = 'rgba(238, 241, 255, 0.65)'
  ctx.font = `500 ${15 * unit}px ${FONT}`
  ctx.fillText(subtitle, view.width / 2, y + 36 * unit)
}
