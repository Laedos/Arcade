import { GRID, isMirrored, type SnakeState } from './game'

const FONT = '"Space Grotesk", system-ui, sans-serif'
const HUD_SPACE = 0.16

export interface Board {
  x: number
  y: number
  size: number
  cell: number
}

// The largest square that fits under the score, centred.
export function fitBoard(width: number, height: number): Board {
  const hud = height * HUD_SPACE
  const size = Math.floor(Math.min(width * 0.94, (height - hud) * 0.94) / GRID) * GRID
  return { size, cell: size / GRID, x: (width - size) / 2, y: hud + (height - hud - size) / 2 }
}

export function draw(ctx: CanvasRenderingContext2D, state: SnakeState, board: Board, width: number, height: number, best: number): void {
  const mirrored = isMirrored(state)
  ctx.fillStyle = mirrored ? '#1f0d26' : '#0c1a17'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = mirrored ? '#2c1236' : '#12251f'
  ctx.fillRect(board.x, board.y, board.size, board.size)
  ctx.strokeStyle = mirrored ? 'rgba(255, 120, 220, 0.5)' : 'rgba(120, 255, 214, 0.35)'
  ctx.lineWidth = 2
  ctx.strokeRect(board.x - 1, board.y - 1, board.size + 2, board.size + 2)

  if (state.food) {
    const cx = board.x + (state.food.x + 0.5) * board.cell
    const cy = board.y + (state.food.y + 0.5) * board.cell
    ctx.fillStyle = '#ffd978'
    ctx.beginPath()
    ctx.arc(cx, cy, board.cell * 0.34, 0, Math.PI * 2)
    ctx.fill()
  }

  state.snake.forEach((cell, i) => {
    const t = i / Math.max(1, state.snake.length - 1)
    const hue = mirrored ? 310 : 160
    ctx.fillStyle = `hsl(${hue} 85% ${68 - t * 28}%)`
    const inset = i === 0 ? 1 : 2
    ctx.fillRect(board.x + cell.x * board.cell + inset, board.y + cell.y * board.cell + inset, board.cell - inset * 2, board.cell - inset * 2)
  })

  const unit = Math.min(width, height) / 700
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#eef1ff'
  ctx.font = `700 ${40 * unit}px ${FONT}`
  ctx.fillText(String(state.score), width / 2, height * HUD_SPACE * 0.45)
  ctx.fillStyle = mirrored ? '#ff9be6' : 'rgba(238, 241, 255, 0.65)'
  ctx.font = `600 ${15 * unit}px ${FONT}`
  const secondsLeft = Math.ceil(state.mirroredUntil - state.time)
  ctx.fillText(mirrored ? `CONTROLS MIRRORED · ${secondsLeft}s` : `BEST ${best}`, width / 2, height * HUD_SPACE * 0.82)

  if (state.phase === 'ready') {
    banner(ctx, board, unit, 'MIRROR SNAKE', 'Arrow keys, WASD or swipe to start', 'Every 4th apple flips your controls')
  } else if (state.phase === 'over') {
    banner(ctx, board, unit, state.food === null ? 'BOARD CLEARED' : 'GAME OVER', `Score ${state.score}`, 'Press Space or tap to play again')
  }
}

function banner(ctx: CanvasRenderingContext2D, board: Board, unit: number, title: string, line1: string, line2: string): void {
  const cx = board.x + board.size / 2
  // Upper quarter of the board, clear of the snake, which starts on the middle row.
  const cy = board.y + board.size * 0.25
  ctx.fillStyle = 'rgba(8, 12, 20, 0.72)'
  ctx.fillRect(board.x, cy - 70 * unit, board.size, 140 * unit)
  ctx.fillStyle = '#eef1ff'
  ctx.font = `700 ${30 * unit}px ${FONT}`
  ctx.fillText(title, cx, cy - 28 * unit)
  ctx.fillStyle = 'rgba(238, 241, 255, 0.8)'
  ctx.font = `500 ${15 * unit}px ${FONT}`
  ctx.fillText(line1, cx, cy + 10 * unit)
  ctx.fillText(line2, cx, cy + 36 * unit)
}
