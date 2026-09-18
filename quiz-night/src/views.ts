import { button, h, isHost, nameOf } from '../../shared/src/rooms/dom'
import type { QuizPlayer, RoomView } from './protocol'

export interface QuizActions {
  answer(choice: number): void
  next(): void
  playAgain(): void
}

// Each choice has a letter and a shape as well as a colour, so it never relies on colour alone.
export const CHOICE_MARKS = ['A ▲', 'B ◆', 'C ●', 'D ■']

export function quizView(room: RoomView, actions: QuizActions): HTMLElement {
  switch (room.phase) {
    case 'question':
      return questionView(room, actions)
    case 'answer':
      return answerView(room, actions)
    case 'scores':
      return scoresView(room, actions)
    default:
      return finalView(room, actions)
  }
}

function header(room: RoomView): HTMLElement {
  const q = room.question!
  return h('div', { class: 'turn-bar' }, h('span', {}, `Question ${q.number} of ${q.total} · ${q.category}`), h('span', { id: 'timer', class: 'timer', role: 'timer' }))
}

function questionView(room: RoomView, actions: QuizActions): HTMLElement {
  const q = room.question!
  const locked = room.yourChoice !== null
  const choices = q.choices.map((text, i) => {
    const b = button('', () => actions.answer(i), `choice c${i}`)
    b.append(h('span', { class: 'mark', 'aria-hidden': 'true' }, CHOICE_MARKS[i]), h('span', {}, text))
    b.setAttribute('aria-label', `${CHOICE_MARKS[i][0]}: ${text}`)
    b.disabled = locked
    if (room.yourChoice === i) b.classList.add('picked')
    return b
  })
  const answered = room.players.filter((p) => p.answered).length
  return h(
    'section',
    { class: 'panel' },
    header(room),
    h('h2', { class: 'question' }, q.text),
    h('div', { class: 'choices' }, ...choices),
    h('p', { class: 'hint' }, locked ? `Locked in. ${answered} of ${room.players.length} answered.` : `${answered} of ${room.players.length} answered.`),
  )
}

function hostOrWait(room: RoomView, label: string, onClick: () => void, waiting: string): HTMLElement {
  return isHost(room) ? button(label, onClick, 'primary') : h('p', { class: 'hint' }, waiting)
}

function answerView(room: RoomView, actions: QuizActions): HTMLElement {
  const q = room.question!
  const answer = room.answer!
  const most = Math.max(1, ...answer.picks)
  const rows = q.choices.map((text, i) => {
    const correct = i === answer.correct
    const yours = i === room.yourChoice
    return h(
      'li',
      { class: `result c${i}${correct ? ' correct' : ''}` },
      h('span', { class: 'mark', 'aria-hidden': 'true' }, CHOICE_MARKS[i]),
      h('span', { class: 'result-text' }, text, correct && h('span', { class: 'tag' }, 'correct'), yours && h('span', { class: 'tag' }, 'your pick')),
      h('span', { class: 'bar', style: `--share: ${answer.picks[i] / most}` }),
      h('span', { class: 'count' }, String(answer.picks[i])),
    )
  })
  const gained = answer.gains[room.youId] ?? 0
  let verdict = 'No answer this time.'
  if (room.yourChoice !== null) verdict = gained > 0 ? `Right! +${gained} points.` : 'Not this time.'
  return h(
    'section',
    { class: 'panel' },
    header(room),
    h('h2', { class: 'question' }, q.text),
    h('ul', { class: 'results' }, ...rows),
    h('p', { class: 'verdict' }, verdict),
    hostOrWait(room, 'Show scores', actions.next, 'The host will show the scores…'),
  )
}

export function ranked(players: QuizPlayer[]): QuizPlayer[] {
  return [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

function leaderboard(room: RoomView): HTMLElement {
  const gains = room.answer?.gains ?? {}
  return h(
    'ol',
    { class: 'leaderboard' },
    ...ranked(room.players).map((p) =>
      h(
        'li',
        { class: p.id === room.youId ? 'you' : '' },
        h('span', { class: 'name' }, p.name),
        gains[p.id] ? h('span', { class: 'gain' }, `+${gains[p.id]}`) : null,
        h('span', { class: 'points' }, String(p.score)),
      ),
    ),
  )
}

function scoresView(room: RoomView, actions: QuizActions): HTMLElement {
  const q = room.question!
  return h(
    'section',
    { class: 'panel' },
    h('p', { class: 'hint' }, `After question ${q.number} of ${q.total}`),
    h('h2', {}, 'Scores'),
    leaderboard(room),
    hostOrWait(room, 'Next question', actions.next, 'The host will start the next question…'),
  )
}

function finalView(room: RoomView, actions: QuizActions): HTMLElement {
  const [first, second, third] = ranked(room.players)
  const step = (player: QuizPlayer | undefined, place: string) =>
    player && h('div', { class: `step place-${place}` }, h('span', { class: 'name' }, player.name), h('span', { class: 'points' }, `${player.score}`), h('span', { class: 'plinth' }, place))
  return h(
    'section',
    { class: 'panel' },
    h('h2', {}, first ? `${nameOf(room, first.id)} wins!` : 'Game over'),
    h('div', { class: 'podium' }, step(second, '2'), step(first, '1'), step(third, '3')),
    leaderboard(room),
    hostOrWait(room, 'Play again', actions.playAgain, 'Waiting for the host…'),
  )
}
