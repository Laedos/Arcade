// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { PlayerView, RoomView } from './protocol'
import { formatSeconds, homeView, type RoomActions, roomView, type TurnSlots } from './views'

const player = (id: string, extra: Partial<PlayerView> = {}): PlayerView => ({ id, name: id.toUpperCase(), connected: true, isHost: false, submitted: false, ...extra })

function room(extra: Partial<RoomView> = {}): RoomView {
  return {
    code: 'ABCD',
    youId: 'a',
    phase: 'lobby',
    players: [player('a', { isHost: true }), player('b')],
    step: 0,
    totalSteps: 2,
    deadline: null,
    task: null,
    reveal: null,
    ...extra,
  }
}

function actions(): RoomActions {
  return { start: vi.fn(), copyLink: vi.fn(), submitText: vi.fn(), submitDrawing: vi.fn(), revealNext: vi.fn(), playAgain: vi.fn() }
}

function slots(): TurnSlots {
  const pad = document.createElement('div')
  pad.textContent = 'PAD'
  return { pad, text: document.createElement('input') }
}

const buttons = (el: HTMLElement) => [...el.querySelectorAll('button')].map((b) => b.textContent)
const click = (el: HTMLElement, label: string) => [...el.querySelectorAll('button')].find((b) => b.textContent === label)!.click()

describe('homeView', () => {
  it('creates or joins with the typed name and an upper-cased code', () => {
    const create = vi.fn()
    const join = vi.fn()
    const view = homeView({ name: 'Ana', code: '' }, false, { create, join })
    view.querySelector<HTMLInputElement>('#code')!.value = ' wxyz '
    click(view, 'Create a room')
    click(view, 'Join')
    expect(create).toHaveBeenCalledWith('Ana')
    expect(join).toHaveBeenCalledWith('Ana', 'WXYZ')
  })

  it('disables both buttons while busy and pre-fills a code from an invite link', () => {
    const view = homeView({ name: '', code: 'WXYZ' }, true, { create: vi.fn(), join: vi.fn() })
    expect([...view.querySelectorAll('button')].every((b) => b.disabled)).toBe(true)
    expect(view.querySelector<HTMLInputElement>('#code')!.value).toBe('WXYZ')
  })
})

describe('lobby', () => {
  it('shows the code and players, and lets the host start', () => {
    const a = actions()
    const view = roomView(room(), slots(), a)
    expect(view.querySelector('.room-code')!.textContent).toBe('ABCD')
    expect(view.querySelector('.players')!.textContent).toBe('AyouhostB')
    click(view, 'Start game')
    click(view, 'Copy invite link')
    expect(a.start).toHaveBeenCalled()
    expect(a.copyLink).toHaveBeenCalled()
  })

  it('keeps Start disabled until there are enough players', () => {
    const view = roomView(room({ players: [player('a', { isHost: true })] }), slots(), actions())
    expect(view.querySelector<HTMLButtonElement>('.primary')!.disabled).toBe(true)
    expect(view.textContent).toContain('Need at least 2 players.')
  })

  it('tells everyone else to wait for the host', () => {
    const view = roomView(room({ youId: 'b' }), slots(), actions())
    expect(buttons(view)).toEqual(['Copy invite link'])
    expect(view.textContent).toContain('Waiting for the host to start')
  })
})

describe('playing', () => {
  it('asks for a prompt on the first turn and submits the typed text', () => {
    const a = actions()
    const s = slots()
    const view = roomView(room({ phase: 'playing', task: { kind: 'write', step: 0, previous: null } }), s, a)
    expect(view.querySelector('h2')!.textContent).toBe('Write something for someone to draw')
    expect(view.textContent).toContain('Turn 1 of 2')
    expect(s.text.getAttribute('aria-label')).toBe('Your prompt')
    s.text.value = 'a cat'
    view.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(a.submitText).toHaveBeenCalledWith('a cat')
  })

  it('shows the prompt with the drawing pad on a draw turn', () => {
    const a = actions()
    const view = roomView(room({ phase: 'playing', step: 1, task: { kind: 'draw', step: 1, previous: { kind: 'prompt', authorId: 'b', text: 'a cat' } } }), slots(), a)
    expect(view.querySelector('.prompt')!.textContent).toBe('a cat')
    expect(view.textContent).toContain('PAD')
    click(view, 'Done')
    expect(a.submitDrawing).toHaveBeenCalled()
  })

  it('shows a drawing to guess on a guess turn', () => {
    const s = slots()
    const view = roomView(room({ phase: 'playing', step: 2, task: { kind: 'guess', step: 2, previous: { kind: 'drawing', authorId: 'b', strokes: [] } } }), s, actions())
    expect(view.querySelector('canvas[data-drawing="task"]')).not.toBeNull()
    expect(s.text.getAttribute('aria-label')).toBe('Your guess')
  })

  it('handles a draw turn whose previous entry is somehow missing', () => {
    const view = roomView(room({ phase: 'playing', step: 1, task: { kind: 'draw', step: 1, previous: null } }), slots(), actions())
    expect(view.querySelector('.prompt')!.textContent).toBe('')
  })

  it('shows who is still working once you have submitted', () => {
    const players = [player('a', { submitted: true }), player('b', { connected: false })]
    const view = roomView(room({ phase: 'playing', players }), slots(), actions())
    expect(view.querySelector('h2')!.textContent).toBe('Waiting for everyone else…')
    expect([...view.querySelectorAll('.tick')].map((t) => t.getAttribute('aria-label'))).toEqual(['done', 'still working'])
    expect(view.querySelector('li.away')!.textContent).toContain('away')
  })
})

describe('reveal', () => {
  const chains = [
    {
      ownerId: 'a',
      entries: [
        { kind: 'prompt' as const, authorId: 'a', text: 'a cat' },
        { kind: 'drawing' as const, authorId: 'b', strokes: [] },
      ],
    },
  ]

  it('lists the chain so far and marks the newest drawing for animation', () => {
    const a = actions()
    const view = roomView(room({ phase: 'reveal', reveal: { chains, chain: 0, entry: 1, finished: false } }), slots(), a)
    expect(view.querySelector('h2')!.textContent).toBe('A’s chain')
    expect([...view.querySelectorAll('.author')].map((e) => e.textContent)).toEqual(['A wrote', 'B drew'])
    expect(view.querySelector('canvas')!.dataset.animate).toBe('true')
    click(view, 'Next')
    expect(a.revealNext).toHaveBeenCalled()
  })

  it('offers the host another round at the end', () => {
    const a = actions()
    const view = roomView(room({ phase: 'reveal', reveal: { chains, chain: 0, entry: 1, finished: true } }), slots(), a)
    expect(view.querySelector('canvas')!.dataset.animate).toBeUndefined()
    click(view, 'Play again')
    expect(a.playAgain).toHaveBeenCalled()
  })

  it('tells other players the host is in charge', () => {
    const during = roomView(room({ youId: 'b', phase: 'reveal', reveal: { chains, chain: 0, entry: 0, finished: false } }), slots(), actions())
    const after = roomView(room({ youId: 'b', phase: 'reveal', reveal: { chains, chain: 0, entry: 1, finished: true } }), slots(), actions())
    expect(during.textContent).toContain('The host is revealing')
    expect(after.textContent).toContain('Waiting for the host')
    expect(buttons(during)).toEqual([])
  })

  it('names an author who has left as Someone', () => {
    const view = roomView(room({ phase: 'reveal', players: [], reveal: { chains, chain: 0, entry: 0, finished: false } }), slots(), actions())
    expect(view.querySelector('.author')!.textContent).toBe('Someone wrote')
  })
})

describe('formatSeconds', () => {
  it('rounds up to whole seconds and never goes negative', () => {
    expect(formatSeconds(75_000)).toBe('1:15')
    expect(formatSeconds(4_100)).toBe('0:05')
    expect(formatSeconds(-10)).toBe('0:00')
  })
})
