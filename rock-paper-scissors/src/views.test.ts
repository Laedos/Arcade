// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { sampleChoose, sampleLocked, sampleOver, sampleReveal } from './fixtures'
import type { RoomView } from './protocol'
import { type DuelActions, duelView } from './views'

const actions = (): DuelActions => ({ play: vi.fn(), next: vi.fn(), rematch: vi.fn() })
const asGuest = (room: RoomView): RoomView => ({ ...room, youId: 'ana' })
const click = (el: HTMLElement, label: string) => [...el.querySelectorAll('button')].find((b) => b.textContent === label)!.click()

describe('choose', () => {
  it('shows the score and three moves, and plays on click', () => {
    const a = actions()
    const view = duelView(sampleChoose, a)
    expect(view.textContent).toContain('Round 4 · first to 3')
    expect(view.querySelector('.score')!.textContent).toBe('2 – 1')
    const moves = [...view.querySelectorAll<HTMLButtonElement>('button.move')]
    expect(moves.map((m) => m.textContent)).toEqual(['✊Rock', '✋Paper', '✌️Scissors'])
    moves[2].click()
    expect(a.play).toHaveBeenCalledWith('scissors')
    expect(view.textContent).toContain('Ana has picked. Your move!')
  })

  it('locks your pick in and waits for the other player', () => {
    const view = duelView(sampleLocked, actions())
    const moves = [...view.querySelectorAll<HTMLButtonElement>('button.move')]
    expect(moves.every((m) => m.disabled)).toBe(true)
    expect(moves[1].getAttribute('aria-pressed')).toBe('true')
    expect(view.textContent).toContain('Locked in Paper. Waiting for Ana…')
  })

  it('covers both locked, neither locked, and no opponent yet', () => {
    const both = { ...sampleLocked, players: sampleLocked.players.map((p) => ({ ...p, locked: true })) }
    expect(duelView(both, actions()).textContent).toContain('Both locked in…')
    const neither = { ...sampleChoose, players: sampleChoose.players.map((p) => ({ ...p, locked: false })) }
    expect(duelView(neither, actions()).textContent).toContain('Pick your move.')
    const alone = { ...sampleLocked, players: sampleLocked.players.slice(0, 1) }
    const view = duelView(alone, actions())
    expect(view.textContent).toContain('Waiting for your opponent…')
    expect(view.querySelector('.score')!.textContent).toBe('2 – 0')
  })
})

describe('reveal', () => {
  it('shows both hands and who took the round, with Next for the host', () => {
    const a = actions()
    const view = duelView(sampleReveal, a)
    expect([...view.querySelectorAll('.hand')].map((h) => h.textContent)).toEqual(['✋You: Paper', '✊Ana: Rock'])
    expect(view.querySelector('.headline')!.textContent).toBe('You win the round!')
    click(view, 'Next round')
    expect(a.next).toHaveBeenCalled()
  })

  it('words a loss and a draw, and makes the guest wait', () => {
    const lost = duelView(asGuest(sampleReveal), actions())
    expect(lost.querySelector('.headline')!.textContent).toBe('Sam wins the round.')
    expect(lost.textContent).toContain('Next round coming up')
    const draw = duelView({ ...sampleReveal, lastRound: { moves: { you: 'rock', ana: 'rock' }, winnerId: null } }, actions())
    expect(draw.querySelector('.headline')!.textContent).toBe('Draw!')
  })

  it('shows a missing move as a question mark', () => {
    const view = duelView({ ...sampleReveal, lastRound: { moves: { you: 'rock' }, winnerId: 'you' } }, actions())
    expect(view.querySelectorAll('.hand')[1].textContent).toBe('?Ana: no move')
  })
})

describe('match over', () => {
  it('announces the winner and offers the host a rematch', () => {
    const a = actions()
    const view = duelView(sampleOver, a)
    expect(view.querySelector('.headline')!.textContent).toBe('You win the match!')
    click(view, 'Rematch')
    expect(a.rematch).toHaveBeenCalled()
    const guest = duelView(asGuest(sampleOver), actions())
    expect(guest.querySelector('.headline')!.textContent).toBe('Sam wins the match.')
    expect(guest.textContent).toContain('Waiting for a rematch')
  })

  it('copes with no recorded winner', () => {
    expect(duelView({ ...sampleOver, matchWinnerId: null }, actions()).querySelector('.headline')!.textContent).toBe('Nobody wins the match.')
  })
})
