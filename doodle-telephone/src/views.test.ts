// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { PlayerView, RoomView } from './protocol'
import { type RoomActions, roomView, type TurnSlots } from './views'

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
  return { submitText: vi.fn(), submitDrawing: vi.fn(), revealNext: vi.fn(), playAgain: vi.fn() }
}

function slots(): TurnSlots {
  const pad = document.createElement('div')
  pad.textContent = 'PAD'
  return { pad, text: document.createElement('input') }
}

const buttons = (el: HTMLElement) => [...el.querySelectorAll('button')].map((b) => b.textContent)
const click = (el: HTMLElement, label: string) => [...el.querySelectorAll('button')].find((b) => b.textContent === label)!.click()

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

describe('reveal entry classes', () => {
  it('never reuse the draw screen’s .prompt and .drawing classes on a whole entry', () => {
    const chains = [
      {
        ownerId: 'a',
        entries: [
          { kind: 'prompt' as const, authorId: 'a', text: 'a cat' },
          { kind: 'drawing' as const, authorId: 'b', strokes: [] },
        ],
      },
    ]
    const view = roomView(room({ phase: 'reveal', reveal: { chains, chain: 0, entry: 1, finished: false } }), slots(), actions())
    const entries = [...view.querySelectorAll('li')]
    expect(entries.map((li) => li.className)).toEqual(['entry entry-prompt', 'entry entry-drawing'])
    expect(view.querySelectorAll('li.prompt, li.drawing')).toHaveLength(0)
  })
})
