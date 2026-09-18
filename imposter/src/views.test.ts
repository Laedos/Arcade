// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { sampleClues, sampleImposter, sampleResult, sampleVote, sampleVoted, sampleYourTurn } from './fixtures'
import type { RoomView } from './protocol'
import { type ImposterActions, imposterView } from './views'

const actions = (): ImposterActions => ({ clue: vi.fn(), vote: vi.fn(), playAgain: vi.fn() })
const input = () => document.createElement('input')
const render = (room: RoomView, a = actions(), field = input()) => imposterView(room, field, a)
const click = (el: HTMLElement, label: string) => [...el.querySelectorAll('button')].find((b) => b.textContent === label)!.click()

describe('clues', () => {
  it('shows your word, everyone’s clues so far, and whose turn it is', () => {
    const view = render(sampleClues)
    expect(view.querySelector('.role-word')!.textContent).toBe('Beach')
    expect(view.querySelector('.role-label')!.textContent).toBe('The word · Places')
    const rows = [...view.querySelectorAll('.clues li')]
    expect(rows.map((r) => r.querySelector('.clue')!.textContent)).toEqual(['—', 'Sand', 'Towel', 'thinking…'])
    expect(rows[0].querySelector('.name')!.textContent).toBe('Sam (you)')
    expect(rows[3].className).toBe('turn')
    expect(view.textContent).toContain('Waiting for Cy’s clue')
  })

  it('asks for your clue on your turn and sends it trimmed', () => {
    const a = actions()
    const field = input()
    const view = render(sampleYourTurn, a, field)
    expect(field.getAttribute('aria-label')).toBe('Your one-word clue')
    field.value = '  Waves '
    view.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(a.clue).toHaveBeenCalledWith('Waves')
  })

  it('tells the imposter the category but never the word', () => {
    const view = render(sampleImposter)
    expect(view.querySelector('.role.imposter')).not.toBeNull()
    expect(view.textContent).toContain('You are the imposter')
    expect(view.textContent).toContain('Category: Places')
    expect(view.textContent).not.toContain('Beach')
  })

  it('handles a moment with no one on turn and no role yet', () => {
    const view = render({ ...sampleClues, turnId: null, role: null })
    expect(view.querySelector('.role')).toBeNull()
    expect(view.textContent).toContain('Waiting…')
  })
})

describe('vote', () => {
  it('lists everyone else with their clue and votes on click', () => {
    const a = actions()
    const view = render(sampleVote, a)
    const ballot = [...view.querySelectorAll<HTMLButtonElement>('.suspect')]
    expect(ballot.map((b) => b.textContent)).toEqual(['Ana · “Sand”', 'Ben · “Towel”', 'Cy · “Holiday”'])
    ballot[2].click()
    expect(a.vote).toHaveBeenCalledWith('cy')
    expect(view.textContent).toContain('2 of 4 have voted.')
  })

  it('locks the ballot after you vote and shows who you picked', () => {
    const view = render(sampleVoted)
    expect(view.querySelector('h2')!.textContent).toBe('You voted for Cy')
    const ballot = [...view.querySelectorAll<HTMLButtonElement>('.suspect')]
    expect(ballot.every((b) => b.disabled)).toBe(true)
    expect(ballot[2].getAttribute('aria-pressed')).toBe('true')
    expect([...view.querySelectorAll('.tick')].map((t) => t.getAttribute('aria-label'))).toEqual(['voted', 'voted', 'not voted yet', 'voted'])
  })

  it('shows a player who gave no clue by name only', () => {
    const view = render({ ...sampleVote, players: sampleVote.players.map((p) => ({ ...p, clue: null })) })
    expect(view.querySelector('.suspect')!.textContent).toBe('Ana')
  })
})

describe('result', () => {
  it('reveals the imposter and the word, with the vote tally, and offers the host a rematch', () => {
    const a = actions()
    const view = render(sampleResult, a)
    expect(view.querySelector('h2')!.textContent).toBe('Caught! Cy was the imposter.')
    expect(view.querySelector('.reveal-word')!.textContent).toBe('The word was Beach')
    const rows = [...view.querySelectorAll('.tally li')]
    expect(rows.map((r) => r.querySelector('.name')!.textContent)).toEqual(['Cy', 'Ben', 'Sam', 'Ana'])
    expect(rows[0].className).toBe('imposter')
    expect(rows[2].querySelector('.votes')!.textContent).toBe('0 votes')
    click(view, 'Play again')
    expect(a.playAgain).toHaveBeenCalled()
  })

  it('words the headline for an escape, and for the imposter themselves', () => {
    const escaped = { ...sampleResult.result!, caught: false }
    expect(render({ ...sampleResult, result: escaped }).querySelector('h2')!.textContent).toBe('Cy was the imposter, and got away.')
    expect(render({ ...sampleResult, youId: 'cy', result: escaped }).querySelector('h2')!.textContent).toBe('You got away with it!')
    expect(render({ ...sampleResult, youId: 'cy' }).querySelector('h2')!.textContent).toBe('You were caught!')
  })

  it('makes everyone but the host wait', () => {
    const view = render({ ...sampleResult, youId: 'ana' })
    expect(view.querySelector('button')).toBeNull()
    expect(view.textContent).toContain('Waiting for the host')
  })
})
