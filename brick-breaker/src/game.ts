export const WORLD_WIDTH = 400
export const WORLD_HEIGHT = 600
export const PADDLE_Y = 560
export const PADDLE_HEIGHT = 12
export const PADDLE_WIDTH = 72
export const BALL_RADIUS = 6
export const START_LIVES = 3

const BRICK_COLS = 8
const BRICK_HEIGHT = 16
const BRICK_GAP = 6
const BRICK_MARGIN = 16
const BRICK_TOP = 70
const BASE_SPEED = 330
const LEVEL_SPEEDUP = 25
const HIT_SPEEDUP = 1.01
const MAX_SPEED = 620
const PADDLE_SPEED = 520
const MAX_BOUNCE_ANGLE = Math.PI / 3
const MAX_SUBSTEP = 3

export type Phase = 'ready' | 'playing' | 'over'

export interface Brick {
  x: number
  y: number
  width: number
  height: number
  row: number
  points: number
  alive: boolean
}

export interface Ball {
  x: number
  y: number
  vx: number
  vy: number
}

export interface BreakerState {
  phase: Phase
  level: number
  lives: number
  score: number
  paddleX: number
  ball: Ball
  speed: number
  bricks: Brick[]
}

// Where the player wants the paddle: an absolute x from a pointer, or a direction from keys.
export interface PaddleInput {
  targetX: number | null
  direction: -1 | 0 | 1
}

export function rowsForLevel(level: number): number {
  return Math.min(8, 4 + level)
}

export function buildBricks(level: number): Brick[] {
  const rows = rowsForLevel(level)
  const width = (WORLD_WIDTH - BRICK_MARGIN * 2 - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS
  const bricks: Brick[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: BRICK_MARGIN + col * (width + BRICK_GAP),
        y: BRICK_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        width,
        height: BRICK_HEIGHT,
        row,
        // Higher rows are worth more.
        points: (rows - row) * 10,
        alive: true,
      })
    }
  }
  return bricks
}

export function createGame(): BreakerState {
  const state: BreakerState = {
    phase: 'ready',
    level: 1,
    lives: START_LIVES,
    score: 0,
    paddleX: WORLD_WIDTH / 2,
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    speed: BASE_SPEED,
    bricks: buildBricks(1),
  }
  restOnPaddle(state)
  return state
}

export function launch(state: BreakerState): boolean {
  if (state.phase !== 'ready') return false
  const angle = MAX_BOUNCE_ANGLE / 3
  state.ball.vx = state.speed * Math.sin(angle)
  state.ball.vy = -state.speed * Math.cos(angle)
  state.phase = 'playing'
  return true
}

export function step(state: BreakerState, dt: number, input: PaddleInput): void {
  if (state.phase === 'over') return
  movePaddle(state, dt, input)
  if (state.phase === 'ready') {
    restOnPaddle(state)
    return
  }

  const distance = Math.hypot(state.ball.vx, state.ball.vy) * dt
  const substeps = Math.max(1, Math.ceil(distance / MAX_SUBSTEP))
  for (let i = 0; i < substeps && state.phase === 'playing'; i++) advanceBall(state, dt / substeps)
}

function movePaddle(state: BreakerState, dt: number, input: PaddleInput): void {
  const half = PADDLE_WIDTH / 2
  const wanted = input.targetX ?? state.paddleX + input.direction * PADDLE_SPEED * dt
  state.paddleX = Math.min(WORLD_WIDTH - half, Math.max(half, wanted))
}

function restOnPaddle(state: BreakerState): void {
  state.ball = { x: state.paddleX, y: PADDLE_Y - BALL_RADIUS, vx: 0, vy: 0 }
}

function advanceBall(state: BreakerState, dt: number): void {
  const ball = state.ball
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  if (ball.x < BALL_RADIUS) {
    ball.x = BALL_RADIUS
    ball.vx = Math.abs(ball.vx)
  } else if (ball.x > WORLD_WIDTH - BALL_RADIUS) {
    ball.x = WORLD_WIDTH - BALL_RADIUS
    ball.vx = -Math.abs(ball.vx)
  }
  if (ball.y < BALL_RADIUS) {
    ball.y = BALL_RADIUS
    ball.vy = Math.abs(ball.vy)
  }

  bounceOffPaddle(state)
  hitBrick(state)

  if (ball.y - BALL_RADIUS > WORLD_HEIGHT) loseLife(state)
}

// The further from the paddle's centre the ball lands, the steeper it leaves, which is what lets
// a player aim.
function bounceOffPaddle(state: BreakerState): void {
  const ball = state.ball
  const half = PADDLE_WIDTH / 2
  const withinX = Math.abs(ball.x - state.paddleX) <= half + BALL_RADIUS
  const touchingTop = ball.y + BALL_RADIUS >= PADDLE_Y && ball.y <= PADDLE_Y + PADDLE_HEIGHT
  if (ball.vy <= 0 || !withinX || !touchingTop) return
  const offset = Math.max(-1, Math.min(1, (ball.x - state.paddleX) / half))
  const angle = offset * MAX_BOUNCE_ANGLE
  ball.vx = state.speed * Math.sin(angle)
  ball.vy = -state.speed * Math.cos(angle)
  ball.y = PADDLE_Y - BALL_RADIUS
}

function hitBrick(state: BreakerState): void {
  const ball = state.ball
  for (const brick of state.bricks) {
    if (!brick.alive) continue
    const nearestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width))
    const nearestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height))
    if (Math.hypot(ball.x - nearestX, ball.y - nearestY) > BALL_RADIUS) continue

    brick.alive = false
    state.score += brick.points
    // Bounce off whichever face the ball is pushed into least, i.e. the one it came through.
    const overlapX = Math.min(ball.x + BALL_RADIUS - brick.x, brick.x + brick.width - (ball.x - BALL_RADIUS))
    const overlapY = Math.min(ball.y + BALL_RADIUS - brick.y, brick.y + brick.height - (ball.y - BALL_RADIUS))
    if (overlapX < overlapY) ball.vx = -ball.vx
    else ball.vy = -ball.vy

    state.speed = Math.min(MAX_SPEED, state.speed * HIT_SPEEDUP)
    const scale = state.speed / Math.hypot(ball.vx, ball.vy)
    ball.vx *= scale
    ball.vy *= scale

    if (state.bricks.every((b) => !b.alive)) nextLevel(state)
    return
  }
}

function loseLife(state: BreakerState): void {
  state.lives -= 1
  if (state.lives <= 0) {
    state.phase = 'over'
    return
  }
  state.phase = 'ready'
  restOnPaddle(state)
}

function nextLevel(state: BreakerState): void {
  state.level += 1
  state.bricks = buildBricks(state.level)
  state.speed = Math.min(MAX_SPEED, BASE_SPEED + LEVEL_SPEEDUP * (state.level - 1))
  state.phase = 'ready'
  restOnPaddle(state)
}
