import { button, h, isHost, nameOf } from '../../shared/src/rooms/dom'
import { BEST_OF, type DuelPlayer, type Move, type RoomView } from './protocol'

export interface DuelActions {
  play(move: Move): void
  next(): void
  rematch(): void
}

export const MOVES: { move: Move; icon: string; label: string }[] = [
  { move: 'rock', icon: '✊', label: 'Rock' },
  { move: 'paper', icon: '✋', label: 'Paper' },
  { move: 'scissors', icon: '✌️', label: 'Scissors' },
]

const iconOf = (move: Move) => MOVES.find((m) => m.move === move)!.icon
const labelOf = (move: Move) => MOVES.find((m) => m.move === move)!.label

export function duelView(room: RoomView, actions: DuelActions): HTMLElement {
  switch (room.phase) {
    case 'choose':
      return chooseView(room, actions)
    case 'reveal':
      return revealView(room, actions)
    default:
      return overView(room, actions)
  }
}

function sides(room: RoomView): { you: DuelPlayer | undefined; them: DuelPlayer | undefined } {
  return { you: room.players.find((p) => p.id === room.youId), them: room.players.find((p) => p.id !== room.youId) }
}

function scoreboard(room: RoomView): HTMLElement {
  const { you, them } = sides(room)
  return h(
    'div',
    { class: 'scoreboard' },
    h('span', { class: 'side' }, 'You'),
    h('span', { class: 'score', 'aria-label': `${you?.wins ?? 0} to ${them?.wins ?? 0}` }, `${you?.wins ?? 0} – ${them?.wins ?? 0}`),
    h('span', { class: 'side' }, them?.name ?? 'Waiting…'),
  )
}

function chooseView(room: RoomView, actions: DuelActions): HTMLElement {
  const { them } = sides(room)
  const buttons = MOVES.map(({ move, icon, label }) => {
    const b = button('', () => actions.play(move), 'move')
    b.append(h('span', { class: 'icon', 'aria-hidden': 'true' }, icon), h('span', {}, label))
    b.setAttribute('aria-pressed', String(room.yourMove === move))
    b.disabled = room.yourMove !== null
    return b
  })
  let status: string
  if (room.yourMove) status = them?.locked ? 'Both locked in…' : `Locked in ${labelOf(room.yourMove)}. Waiting for ${them?.name ?? 'your opponent'}…`
  else status = them?.locked ? `${them.name} has picked. Your move!` : 'Pick your move.'
  return h(
    'section',
    { class: 'panel' },
    h('div', { class: 'turn-bar' }, h('span', {}, `Round ${room.round} · first to ${Math.ceil(BEST_OF / 2)}`), h('span', { id: 'timer', class: 'timer', role: 'timer' })),
    scoreboard(room),
    h('div', { class: 'moves' }, ...buttons),
    h('p', { class: 'hint', 'aria-live': 'polite' }, status),
  )
}

function revealView(room: RoomView, actions: DuelActions): HTMLElement {
  const result = room.lastRound!
  const { you, them } = sides(room)
  const yours = you ? result.moves[you.id] : undefined
  const theirs = them ? result.moves[them.id] : undefined
  let headline = 'Draw!'
  if (result.winnerId) headline = result.winnerId === room.youId ? 'You win the round!' : `${nameOf(room, result.winnerId)} wins the round.`
  const hand = (who: string, move: Move | undefined) =>
    h('div', { class: 'hand' }, h('span', { class: 'icon', 'aria-hidden': 'true' }, move ? iconOf(move) : '?'), h('span', {}, `${who}: ${move ? labelOf(move) : 'no move'}`))
  return h(
    'section',
    { class: 'panel' },
    h('div', { class: 'turn-bar' }, h('span', {}, `Round ${room.round}`)),
    scoreboard(room),
    h('div', { class: 'showdown' }, hand('You', yours), h('span', { class: 'vs' }, 'vs'), hand(them?.name ?? 'Them', theirs)),
    h('h2', { class: 'headline' }, headline),
    isHost(room) ? button('Next round', actions.next, 'primary') : h('p', { class: 'hint' }, 'Next round coming up…'),
  )
}

function overView(room: RoomView, actions: DuelActions): HTMLElement {
  const won = room.matchWinnerId === room.youId
  const winner = room.matchWinnerId ? nameOf(room, room.matchWinnerId) : 'Nobody'
  return h(
    'section',
    { class: 'panel' },
    scoreboard(room),
    h('h2', { class: 'headline' }, won ? 'You win the match!' : `${winner} wins the match.`),
    isHost(room) ? button('Rematch', actions.rematch, 'primary') : h('p', { class: 'hint' }, 'Waiting for a rematch…'),
  )
}
