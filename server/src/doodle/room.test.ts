import { describe, expect, it } from 'vitest'
import { CANVAS_SIZE, MAX_NAME_LENGTH, MAX_PLAYERS, MAX_TEXT_LENGTH, type Stroke } from '../../../doodle-telephone/src/protocol'
import {
  chainIndexFor,
  cleanStrokes,
  cleanText,
  createRoom,
  disconnect,
  GRACE_MS,
  nextWakeAt,
  REJOIN_GRACE_MS,
  type IdSource,
  join,
  playAgain,
  revealNext,
  type Room,
  start,
  submit,
  TASK_SECONDS,
  taskFor,
  taskKind,
  tick,
  viewFor,
} from './room'

const STROKE: Stroke = { color: '#1b1b1f', size: 10, points: [10, 10, 20, 20] }

function ids(): IdSource {
  let n = 0
  return { newId: () => `p${++n}`, newToken: () => `t${n}` }
}

function roomWith(count: number): { room: Room; players: string[] } {
  const room = createRoom('ABCD')
  const source = ids()
  const players: string[] = []
  for (let i = 0; i < count; i++) {
    const result = join(room, `P${i + 1}`, null, source)
    if (!result.ok) throw new Error(result.error)
    players.push(result.value.id)
  }
  return { room, players }
}

function started(count: number, now = 0) {
  const setup = roomWith(count)
  expect(start(setup.room, setup.players[0], now).ok).toBe(true)
  return setup
}

function playStep(room: Room, players: string[], now = 0) {
  const kind = taskKind(room.step)
  for (const id of players) {
    const content = kind === 'draw' ? { strokes: [STROKE] } : { text: `${id}@${room.step}` }
    expect(submit(room, id, room.step, content, now)).toEqual({ ok: true, value: undefined })
  }
}

describe('joining', () => {
  it('makes the first player host and keeps names unique', () => {
    const room = createRoom('ABCD')
    const source = ids()
    const first = join(room, '  Ana  ', null, source)
    const second = join(room, 'Ana', null, source)
    expect(first.ok && first.value.name).toBe('Ana')
    expect(second.ok && second.value.name).toBe('Ana 2')
    expect(room.hostId).toBe('p1')
  })

  it('falls back to a default name and trims long ones', () => {
    const room = createRoom('ABCD')
    const source = ids()
    const blank = join(room, '   ', null, source)
    const long = join(room, 'x'.repeat(50), null, source)
    expect(blank.ok && blank.value.name).toBe('Player')
    expect(long.ok && long.value.name).toHaveLength(MAX_NAME_LENGTH)
  })

  it('keeps a numbered duplicate of a long name within the length limit', () => {
    const room = createRoom('ABCD')
    const source = ids()
    join(room, 'y'.repeat(MAX_NAME_LENGTH), null, source)
    const second = join(room, 'y'.repeat(MAX_NAME_LENGTH), null, source)
    expect(second.ok && second.value.name).toBe(`${'y'.repeat(MAX_NAME_LENGTH - 2)} 2`)
  })

  it('refuses a full room and a game in progress', () => {
    const { room } = roomWith(MAX_PLAYERS)
    expect(join(room, 'Late', null, ids())).toEqual({ ok: false, error: 'This room is full.' })

    const game = started(3).room
    expect(join(game, 'Late', null, ids())).toEqual({ ok: false, error: 'This game has already started.' })
  })

  it('lets a player rejoin their seat with their token, even mid-game', () => {
    const { room, players } = started(3)
    disconnect(room, players[1], 0)
    const again = join(room, 'whatever', 't2', ids())
    expect(again.ok && again.value.id).toBe(players[1])
    expect(room.players.find((p) => p.id === players[1])?.connected).toBe(true)
  })
})

describe('leaving', () => {
  it('removes a player who leaves the lobby and hands host to the next one', () => {
    const { room, players } = roomWith(3)
    disconnect(room, players[0], 0)
    expect(room.players.map((p) => p.id)).toEqual([players[1], players[2]])
    expect(room.hostId).toBe(players[1])
  })

  it('keeps a mid-game seat and moves host to someone connected', () => {
    const { room, players } = started(3)
    disconnect(room, players[0], 0)
    expect(room.players).toHaveLength(3)
    expect(room.hostId).toBe(players[1])
  })

  it('waits for the last player still working when they drop, instead of blanking their turn', () => {
    const { room, players } = started(3)
    submit(room, players[0], 0, { text: 'a' }, 0)
    submit(room, players[1], 0, { text: 'b' }, 0)
    disconnect(room, players[2], 1000)
    expect(room.step).toBe(0)
    expect(nextWakeAt(room, 1000)).toBe(1000 + REJOIN_GRACE_MS)

    // Back within the window: the turn is still theirs.
    expect(join(room, '', 't3', ids()).ok).toBe(true)
    expect(tick(room, 1000 + REJOIN_GRACE_MS)).toBe(false)
    expect(submit(room, players[2], 0, { text: 'c' }, 2000).ok).toBe(true)
    expect(room.chains[2].entries[0]).toEqual({ kind: 'prompt', authorId: players[2], text: 'c' })
  })

  it('carries on without a dropped player once their rejoin window closes', () => {
    const { room, players } = started(3)
    submit(room, players[0], 0, { text: 'a' }, 0)
    submit(room, players[1], 0, { text: 'b' }, 0)
    disconnect(room, players[2], 1000)
    expect(tick(room, 1000 + REJOIN_GRACE_MS - 1)).toBe(false)
    expect(tick(room, 1000 + REJOIN_GRACE_MS)).toBe(true)
    expect(room.step).toBe(1)
    expect(room.chains[2].entries[0]).toEqual({ kind: 'prompt', authorId: players[2], text: '…' })
  })

  it('does not let a long-gone player hold up the others', () => {
    const { room, players } = started(3)
    disconnect(room, players[2], 0)
    submit(room, players[0], 0, { text: 'a' }, REJOIN_GRACE_MS)
    submit(room, players[1], 0, { text: 'b' }, REJOIN_GRACE_MS)
    expect(room.step).toBe(1)
  })

  it('wakes at the deadline, or at the end of a rejoin window still running, but never in the past', () => {
    const { room, players } = started(3)
    const deadline = room.deadline! + GRACE_MS
    expect(nextWakeAt(room, 0)).toBe(deadline)
    disconnect(room, players[2], 1000)
    expect(nextWakeAt(room, 1000)).toBe(1000 + REJOIN_GRACE_MS)
    expect(nextWakeAt(room, 1000 + REJOIN_GRACE_MS)).toBe(deadline)
    expect(nextWakeAt(createRoom('ZZZZ'), 0)).toBeNull()
  })

  it('fills a rejoin window that outlasts the turn when the clock runs out', () => {
    const { room, players } = started(2)
    submit(room, players[0], 0, { text: 'a' }, 0)
    disconnect(room, players[1], room.deadline! - 1000)
    expect(tick(room, room.deadline! + GRACE_MS)).toBe(true)
    expect(room.step).toBe(1)
  })

  it('ignores an unknown player', () => {
    const { room } = roomWith(2)
    disconnect(room, 'nobody', 0)
    expect(room.players).toHaveLength(2)
  })

  it('leaves no host once everyone is gone', () => {
    const { room, players } = roomWith(1)
    disconnect(room, players[0], 0)
    expect(room.hostId).toBeNull()
  })
})

describe('starting', () => {
  it('only lets the host start, with enough players, once', () => {
    const { room, players } = roomWith(2)
    expect(start(room, players[1], 0)).toEqual({ ok: false, error: 'Only the host can start the game.' })
    expect(start(room, players[0], 1000).ok).toBe(true)
    expect(room.deadline).toBe(1000 + TASK_SECONDS.write * 1000)
    expect(start(room, players[0], 0)).toEqual({ ok: false, error: 'The game has already started.' })

    const alone = roomWith(1)
    expect(start(alone.room, alone.players[0], 0)).toEqual({ ok: false, error: 'You need at least 2 players.' })
  })
})

describe('turns', () => {
  it('alternates write, draw, guess, draw', () => {
    expect([0, 1, 2, 3, 4].map(taskKind)).toEqual(['write', 'draw', 'guess', 'draw', 'guess'])
  })

  it('passes each chain one seat along every step, so everyone touches every chain once', () => {
    const { room, players } = started(4)
    const seen = new Map(players.map((id) => [id, new Set<number>()]))
    for (let step = 0; step < 4; step++) {
      for (const id of players) seen.get(id)!.add(chainIndexFor(room, id))
      playStep(room, players)
    }
    for (const chains of seen.values()) expect(chains.size).toBe(4)
    expect(chainIndexFor(room, 'stranger')).toBe(-1)
  })

  it('hands each player the previous entry of the chain they now hold', () => {
    const { room, players } = started(3)
    expect(taskFor(room, players[0])).toEqual({ kind: 'write', step: 0, previous: null })
    playStep(room, players)
    expect(taskFor(room, players[1])).toEqual({ kind: 'draw', step: 1, previous: { kind: 'prompt', authorId: players[0], text: `${players[0]}@0` } })
    playStep(room, players)
    const guess = taskFor(room, players[2])
    expect(guess?.kind).toBe('guess')
    expect(guess?.previous).toMatchObject({ kind: 'drawing', authorId: players[1] })
    expect(taskFor(room, 'stranger')).toBeNull()
  })

  it('rejects the wrong turn, the wrong content, strangers and double submits', () => {
    const { room, players } = started(2)
    expect(submit(room, players[0], 1, { text: 'x' }, 0)).toEqual({ ok: false, error: 'That turn is already over.' })
    expect(submit(room, 'stranger', 0, { text: 'x' }, 0)).toEqual({ ok: false, error: 'You are not in this game.' })
    expect(submit(room, players[0], 0, { strokes: [] }, 0)).toEqual({ ok: false, error: 'This turn needs text.' })
    submit(room, players[0], 0, { text: 'x' }, 0)
    expect(submit(room, players[0], 0, { text: 'y' }, 0)).toEqual({ ok: false, error: 'You already submitted this turn.' })
    submit(room, players[1], 0, { text: 'z' }, 0)
    expect(submit(room, players[0], 1, { text: 'x' }, 0)).toEqual({ ok: false, error: 'This turn needs a drawing.' })
  })

  it('refuses submissions outside a game', () => {
    const { room, players } = roomWith(2)
    expect(submit(room, players[0], 0, { text: 'x' }, 0)).toEqual({ ok: false, error: 'There is nothing to submit right now.' })
  })

  it('moves on as soon as everyone has submitted, with a fresh deadline', () => {
    const { room, players } = started(2)
    playStep(room, players, 5000)
    expect(room.step).toBe(1)
    expect(room.submitted).toEqual([])
    expect(room.deadline).toBe(5000 + TASK_SECONDS.draw * 1000)
  })

  it('fills in blanks once the deadline and grace period have passed', () => {
    const { room, players } = started(3)
    submit(room, players[0], 0, { text: 'only me' }, 0)
    const deadline = room.deadline!
    expect(tick(room, deadline + GRACE_MS - 1)).toBe(false)
    expect(tick(room, deadline + GRACE_MS)).toBe(true)
    expect(room.step).toBe(1)
    expect(room.chains[1].entries[0]).toMatchObject({ kind: 'prompt', text: '…' })

    playStep(room, [players[0]])
    tick(room, room.deadline! + GRACE_MS)
    expect(room.chains[0].entries[1]).toEqual({ kind: 'drawing', authorId: players[1], strokes: [] })
    expect(room.chains[0].entries[2] ?? null).toBeNull()
    expect(taskKind(room.step)).toBe('guess')
    tick(room, room.deadline! + GRACE_MS)
    expect(room.chains[2].entries[2]).toMatchObject({ kind: 'guess', text: '…' })
  })

  it('does nothing on tick outside a game', () => {
    const { room } = roomWith(2)
    expect(tick(room, 1e12)).toBe(false)
  })

  it('goes to the reveal after the last step', () => {
    const { room, players } = started(2)
    playStep(room, players)
    playStep(room, players)
    expect(room.phase).toBe('reveal')
    expect(room.deadline).toBeNull()
    expect(room.chains.map((c) => c.entries.length)).toEqual([2, 2])
  })
})

describe('reveal', () => {
  function revealing(count: number) {
    const setup = started(count)
    for (let i = 0; i < count; i++) playStep(setup.room, setup.players)
    return setup
  }

  it('walks entry by entry through each chain, host only, then finishes', () => {
    const { room, players } = revealing(2)
    expect(revealNext(room, players[1])).toEqual({ ok: false, error: 'Only the host can move the reveal on.' })
    const positions: string[] = []
    while (!room.reveal.finished) {
      positions.push(`${room.reveal.chain}.${room.reveal.entry}`)
      revealNext(room, players[0])
    }
    expect(positions).toEqual(['0.0', '0.1', '1.0', '1.1'])
    expect(revealNext(room, players[0])).toEqual({ ok: false, error: 'Nothing left to reveal.' })
  })

  it('shows earlier chains in full and the current one up to the pointer', () => {
    const { room, players } = revealing(3)
    revealNext(room, players[0])
    revealNext(room, players[0])
    revealNext(room, players[0])
    const view = viewFor(room, players[1])
    expect(view.reveal?.chains.map((c) => c.entries.length)).toEqual([3, 1])
  })

  it('returns everyone still here to the lobby for another round', () => {
    const { room, players } = revealing(3)
    expect(playAgain(room, players[0])).toEqual({ ok: false, error: 'Finish the reveal first.' })
    disconnect(room, players[2], 0)
    while (!room.reveal.finished) revealNext(room, players[0])
    expect(playAgain(room, players[1])).toEqual({ ok: false, error: 'Only the host can start a new round.' })
    expect(playAgain(room, players[0]).ok).toBe(true)
    expect(room.phase).toBe('lobby')
    expect(room.players.map((p) => p.id)).toEqual([players[0], players[1]])
    expect(room.chains).toEqual([])
  })
})

describe('viewFor', () => {
  it('shows who has submitted, and hides the task once you have', () => {
    const { room, players } = started(2)
    submit(room, players[0], 0, { text: 'x' }, 0)
    const mine = viewFor(room, players[0])
    expect(mine.task).toBeNull()
    expect(mine.players.map((p) => p.submitted)).toEqual([true, false])
    expect(mine.players[0].isHost).toBe(true)
    expect(viewFor(room, players[1]).task?.kind).toBe('write')
    expect(mine.reveal).toBeNull()
    expect(mine.totalSteps).toBe(2)
  })

  it('never shows submission ticks in the lobby', () => {
    const { room, players } = roomWith(2)
    expect(viewFor(room, players[0]).players.every((p) => !p.submitted)).toBe(true)
  })
})

describe('input cleaning', () => {
  it('collapses whitespace, trims, caps length, and blanks empty text', () => {
    expect(cleanText('  a   cat\n on  a mat ')).toBe('a cat on a mat')
    expect(cleanText('z'.repeat(200))).toHaveLength(MAX_TEXT_LENGTH)
    expect(cleanText('   ')).toBe('…')
  })

  it('keeps valid strokes and clamps their points onto the canvas', () => {
    expect(cleanStrokes([{ color: '#1b1b1f', size: 10, points: [-5, 12.4, 5000, 3, 7] }])).toEqual([
      { color: '#1b1b1f', size: 10, points: [0, 12, CANVAS_SIZE, 3] },
    ])
  })

  it('drops strokes with unknown colours or sizes, bad shapes, or no points', () => {
    expect(
      cleanStrokes([
        { color: '#123456', size: 10, points: [1, 1] },
        { color: '#1b1b1f', size: 7, points: [1, 1] },
        { color: '#1b1b1f', size: 10, points: 'nope' },
        { color: '#1b1b1f', size: 10, points: [1] },
        null,
        'stroke',
      ]),
    ).toEqual([])
    expect(cleanStrokes('not an array')).toEqual([])
  })

  it('turns non-numeric coordinates into zero', () => {
    expect(cleanStrokes([{ color: '#1b1b1f', size: 4, points: ['a', Number.NaN] }])).toEqual([{ color: '#1b1b1f', size: 4, points: [0, 0] }])
  })

  it('caps the total number of points across a drawing', () => {
    const huge = Array.from({ length: 4 }, () => ({ color: '#1b1b1f', size: 4, points: new Array(20000).fill(1) }))
    const kept = cleanStrokes(huge)
    expect(kept.reduce((sum, s) => sum + s.points.length / 2, 0)).toBe(30000)
    expect(kept).toHaveLength(3)
  })
})
