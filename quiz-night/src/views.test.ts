// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { sampleAnswer, sampleFinal, sampleLocked, sampleQuestion, sampleScores } from './fixtures'
import type { RoomView } from './protocol'
import { type QuizActions, quizView, ranked } from './views'

const actions = (): QuizActions => ({ answer: vi.fn(), next: vi.fn(), playAgain: vi.fn() })
const asGuest = (room: RoomView): RoomView => ({ ...room, youId: 'ben' })
const click = (el: HTMLElement, label: string) => [...el.querySelectorAll('button')].find((b) => b.textContent === label)!.click()
// The fixtures draw from the real question bank, so the expectations come from the fixture itself
// rather than a second copy of its wording.
const asked = sampleQuestion.question!
const correct = sampleAnswer.answer!.correct

describe('question', () => {
  it('shows the question with four labelled choices and answers on click', () => {
    const a = actions()
    const view = quizView(sampleQuestion, a)
    expect(view.textContent).toContain(`Question ${asked.number} of ${asked.total} · ${asked.category}`)
    expect(view.querySelector('h2')!.textContent).toBe(asked.text)
    const choices = [...view.querySelectorAll<HTMLButtonElement>('button.choice')]
    expect(choices.map((c) => c.getAttribute('aria-label'))).toEqual(asked.choices.map((choice, i) => `${'ABCD'[i]}: ${choice}`))
    choices[1].click()
    expect(a.answer).toHaveBeenCalledWith(1)
    expect(view.textContent).toContain('1 of 4 answered.')
  })

  it('locks the choices once you have answered, marking your pick', () => {
    const view = quizView(sampleLocked, actions())
    const choices = [...view.querySelectorAll<HTMLButtonElement>('button.choice')]
    expect(choices.every((c) => c.disabled)).toBe(true)
    expect(choices[sampleLocked.yourChoice!].classList.contains('picked')).toBe(true)
    expect(view.textContent).toContain('Locked in.')
  })
})

describe('answer', () => {
  it('marks the correct choice and your pick, shows pick counts and your points', () => {
    const a = actions()
    const view = quizView(sampleAnswer, a)
    const rows = [...view.querySelectorAll('li.result')]
    expect(rows[correct].classList.contains('correct')).toBe(true)
    expect(rows[correct].textContent).toContain('correct')
    expect(rows[correct].textContent).toContain('your pick')
    expect(rows.map((r) => r.querySelector('.count')!.textContent)).toEqual(sampleAnswer.answer!.picks.map(String))
    expect(view.querySelector('.verdict')!.textContent).toBe('Right! +820 points.')
    click(view, 'Show scores')
    expect(a.next).toHaveBeenCalled()
  })

  it('tells a wrong or missing answer apart, and makes guests wait for the host', () => {
    const wrong = quizView(asGuest({ ...sampleAnswer, yourChoice: (correct + 1) % asked.choices.length }), actions())
    expect(wrong.querySelector('.verdict')!.textContent).toBe('Not this time.')
    expect(wrong.querySelector('button')).toBeNull()
    expect(wrong.textContent).toContain('The host will show the scores')

    const none = quizView({ ...sampleAnswer, yourChoice: null }, actions())
    expect(none.querySelector('.verdict')!.textContent).toBe('No answer this time.')
  })

  it('copes with nobody having picked anything', () => {
    const view = quizView({ ...sampleAnswer, answer: { correct: 0, picks: [0, 0, 0, 0], gains: {} } }, actions())
    expect(view.querySelector<HTMLElement>('.bar')!.style.getPropertyValue('--share')).toBe('0')
  })
})

describe('scores', () => {
  it('ranks players, highlights you and shows this round’s gains', () => {
    const a = actions()
    const view = quizView(sampleScores, a)
    const rows = [...view.querySelectorAll('.leaderboard li')]
    expect(rows.map((r) => r.querySelector('.name')!.textContent)).toEqual(['Ana', 'Sam', 'Ben', 'Cy'])
    expect(rows[1].className).toBe('you')
    expect(rows[0].querySelector('.gain')!.textContent).toBe('+910')
    expect(rows[2].querySelector('.gain')).toBeNull()
    click(view, 'Next question')
    expect(a.next).toHaveBeenCalled()
    expect(quizView(asGuest(sampleScores), actions()).textContent).toContain('The host will start the next question')
  })

  it('breaks score ties alphabetically', () => {
    const tied = ranked([
      { id: 'z', name: 'Zed', connected: true, isHost: false, score: 5, answered: false },
      { id: 'a', name: 'Amy', connected: true, isHost: false, score: 5, answered: false },
    ])
    expect(tied.map((p) => p.name)).toEqual(['Amy', 'Zed'])
  })
})

describe('final', () => {
  it('crowns the winner on a podium and offers the host another game', () => {
    const a = actions()
    const view = quizView(sampleFinal, a)
    expect(view.querySelector('h2')!.textContent).toBe('Ana wins!')
    expect([...view.querySelectorAll('.podium .name')].map((n) => n.textContent)).toEqual(['Sam', 'Ana', 'Ben'])
    click(view, 'Play again')
    expect(a.playAgain).toHaveBeenCalled()
    expect(quizView(asGuest(sampleFinal), actions()).textContent).toContain('Waiting for the host')
  })

  it('handles a podium with fewer than three players, or none', () => {
    const two = quizView({ ...sampleFinal, players: sampleFinal.players.slice(0, 2) }, actions())
    expect(two.querySelectorAll('.podium .step')).toHaveLength(2)
    const empty = quizView({ ...sampleFinal, players: [] }, actions())
    expect(empty.querySelector('h2')!.textContent).toBe('Game over')
  })
})
