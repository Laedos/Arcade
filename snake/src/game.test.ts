import { describe, expect, it } from 'vitest'
import { createSnake, GRID, isMirrored, type SnakeState, tick, tickSeconds, turn, update } from './game'

function playing(): SnakeState {
  const state = createSnake(() => 0)
  state.phase = 'playing'
  state.food = { x: 0, y: 0 }
  return state
}

describe('createSnake', () => {
  it('starts ready, three long, heading right, with food off the snake', () => {
    const state = createSnake(() => 0.5)
    expect(state.phase).toBe('ready')
    expect(state.snake).toHaveLength(3)
    expect(state.dir).toBe('right')
    expect(state.snake.some((c) => c.x === state.food!.x && c.y === state.food!.y)).toBe(false)
  })
})

describe('turn', () => {
  it('starts the game on the first key', () => {
    const state = createSnake(() => 0)
    turn(state, 'up')
    expect(state.phase).toBe('playing')
    expect(state.queue).toEqual(['up'])
  })

  it('ignores reversing straight into itself and repeating the current direction', () => {
    const state = playing()
    turn(state, 'left')
    turn(state, 'right')
    expect(state.queue).toEqual([])
  })

  it('queues two quick turns, checking each against the one before', () => {
    const state = playing()
    turn(state, 'up')
    turn(state, 'down')
    turn(state, 'left')
    turn(state, 'down')
    expect(state.queue).toEqual(['up', 'left'])
  })

  it('reverses the controls while mirrored', () => {
    const state = playing()
    state.mirroredUntil = 5
    turn(state, 'down')
    expect(state.queue).toEqual(['up'])
  })

  it('does nothing once over', () => {
    const state = playing()
    state.phase = 'over'
    turn(state, 'up')
    expect(state.queue).toEqual([])
  })
})

describe('tick', () => {
  it('moves the head one cell and drops the tail', () => {
    const state = playing()
    const [head, second] = state.snake
    tick(state)
    expect(state.snake[0]).toEqual({ x: head.x + 1, y: head.y })
    expect(state.snake[1]).toEqual(head)
    expect(state.snake[2]).toEqual(second)
    expect(state.snake).toHaveLength(3)
  })

  it('grows and scores on food, and places new food', () => {
    const state = playing()
    const head = state.snake[0]
    state.food = { x: head.x + 1, y: head.y }
    tick(state)
    expect(state.snake).toHaveLength(4)
    expect(state.score).toBe(1)
    expect(state.food).not.toEqual({ x: head.x + 1, y: head.y })
  })

  it('mirrors the controls for a while every fourth apple', () => {
    const state = playing()
    state.score = 3
    state.time = 10
    const head = state.snake[0]
    state.food = { x: head.x + 1, y: head.y }
    tick(state)
    expect(isMirrored(state)).toBe(true)
    state.time = 15.9
    expect(isMirrored(state)).toBe(true)
    state.time = 16
    expect(isMirrored(state)).toBe(false)
  })

  it('dies on hitting a wall', () => {
    const state = playing()
    state.snake = [{ x: GRID - 1, y: 3 }, { x: GRID - 2, y: 3 }]
    tick(state)
    expect(state.phase).toBe('over')
  })

  it('dies on hitting its own body', () => {
    const state = playing()
    state.snake = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
    ]
    state.dir = 'down'
    tick(state)
    expect(state.phase).toBe('over')
  })

  it('may move into the cell its tail is leaving', () => {
    const state = playing()
    state.snake = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ]
    state.dir = 'down'
    tick(state)
    expect(state.phase).toBe('playing')
    expect(state.snake[0]).toEqual({ x: 5, y: 6 })
  })

  it('ends the game when the board is full', () => {
    const state = playing()
    state.snake = []
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) state.snake.push({ x, y })
    state.snake = state.snake.filter((c) => !(c.x === 1 && c.y === 0))
    state.snake.unshift(state.snake.splice(state.snake.findIndex((c) => c.x === 0 && c.y === 0), 1)[0])
    state.food = { x: 1, y: 0 }
    state.dir = 'right'
    tick(state)
    expect(state.score).toBe(1)
    expect(state.food).toBeNull()
    expect(state.phase).toBe('over')
  })
})

describe('update', () => {
  it('ticks at the current speed and carries the remainder over', () => {
    const state = playing()
    const headX = state.snake[0].x
    update(state, tickSeconds(0) * 2.5)
    expect(state.snake[0].x).toBe(headX + 2)
    expect(state.sinceTick).toBeCloseTo(tickSeconds(0) * 0.5)
  })

  it('stands still before the first key and after the end', () => {
    const state = createSnake(() => 0)
    const snake = structuredClone(state.snake)
    update(state, 5)
    expect(state.snake).toEqual(snake)
    state.phase = 'over'
    update(state, 5)
    expect(state.snake).toEqual(snake)
    expect(state.time).toBe(0)
  })

  it('stops ticking the moment the snake dies', () => {
    const state = playing()
    state.snake = [{ x: GRID - 1, y: 3 }]
    update(state, tickSeconds(0) * 5)
    expect(state.phase).toBe('over')
    expect(state.snake[0]).toEqual({ x: GRID - 1, y: 3 })
  })

  it('speeds up with score, down to a floor', () => {
    expect(tickSeconds(10)).toBeLessThan(tickSeconds(0))
    expect(tickSeconds(1000)).toBe(tickSeconds(500))
  })
})
