import { button, h, isHost, nameOf } from '../../shared/src/rooms/dom'
import { playerList } from '../../shared/src/rooms/lobby'
import { type ImposterPlayer, MAX_CLUE_LENGTH, type Role, type RoomView } from './protocol'

export interface ImposterActions {
  clue(text: string): void
  vote(targetId: string): void
  playAgain(): void
}

export function imposterView(room: RoomView, clueInput: HTMLInputElement, actions: ImposterActions): HTMLElement {
  switch (room.phase) {
    case 'clues':
      return cluesView(room, clueInput, actions)
    case 'vote':
      return voteView(room, actions)
    default:
      return resultView(room, actions)
  }
}

export function roleCard(role: Role): HTMLElement {
  if (role.imposter) {
    return h(
      'div',
      { class: 'role imposter' },
      h('p', { class: 'role-label' }, 'You are the imposter'),
      h('p', { class: 'role-word' }, `Category: ${role.category}`),
      h('p', { class: 'hint' }, 'You don’t know the word. Blend in with a clue that fits the category.'),
    )
  }
  return h('div', { class: 'role' }, h('p', { class: 'role-label' }, `The word · ${role.category}`), h('p', { class: 'role-word' }, role.word ?? ''))
}

function clueList(room: RoomView): HTMLElement {
  return h(
    'ol',
    { class: 'clues' },
    ...room.players.map((p) =>
      h(
        'li',
        { class: p.id === room.turnId ? 'turn' : '' },
        h('span', { class: 'name' }, p.id === room.youId ? `${p.name} (you)` : p.name),
        h('span', { class: 'clue' }, p.clue ?? (p.id === room.turnId ? 'thinking…' : '—')),
      ),
    ),
  )
}

function cluesView(room: RoomView, clueInput: HTMLInputElement, actions: ImposterActions): HTMLElement {
  const yourTurn = room.turnId === room.youId
  let prompt: Node
  if (yourTurn) {
    clueInput.setAttribute('maxlength', String(MAX_CLUE_LENGTH))
    clueInput.setAttribute('aria-label', 'Your one-word clue')
    clueInput.setAttribute('placeholder', 'One word')
    const form = h('form', { class: 'answer' }, clueInput, h('button', { type: 'submit', class: 'primary' }, 'Give clue'))
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      actions.clue(clueInput.value.trim())
    })
    prompt = form
  } else {
    prompt = h('p', { class: 'hint' }, room.turnId ? `Waiting for ${nameOf(room, room.turnId)}’s clue…` : 'Waiting…')
  }
  return h(
    'section',
    { class: 'panel' },
    h('div', { class: 'turn-bar' }, h('span', {}, yourTurn ? 'Your turn' : 'Clues'), h('span', { id: 'timer', class: 'timer', role: 'timer' })),
    room.role && roleCard(room.role),
    clueList(room),
    prompt,
  )
}

function voteView(room: RoomView, actions: ImposterActions): HTMLElement {
  const others = room.players.filter((p) => p.id !== room.youId)
  const ballot = others.map((p) => {
    const label = p.clue ? `${p.name} · “${p.clue}”` : p.name
    const b = button(label, () => actions.vote(p.id), 'suspect')
    b.setAttribute('aria-pressed', String(room.yourVote === p.id))
    b.disabled = room.yourVote !== null
    return b
  })
  const voted = room.players.filter((p) => p.voted).length
  return h(
    'section',
    { class: 'panel' },
    h('div', { class: 'turn-bar' }, h('span', {}, 'Vote'), h('span', { id: 'timer', class: 'timer', role: 'timer' })),
    room.role && roleCard(room.role),
    h('h2', {}, room.yourVote ? `You voted for ${nameOf(room, room.yourVote)}` : 'Who is the imposter?'),
    h('div', { class: 'ballot' }, ...ballot),
    h('p', { class: 'hint' }, `${voted} of ${room.players.length} have voted.`),
    playerList(room, (p) => h('span', { class: 'tick', 'aria-label': (p as ImposterPlayer).voted ? 'voted' : 'not voted yet' }, (p as ImposterPlayer).voted ? '✓' : '…')),
  )
}

function resultView(room: RoomView, actions: ImposterActions): HTMLElement {
  const result = room.result!
  const imposter = nameOf(room, result.imposterId)
  const youWereImposter = result.imposterId === room.youId
  let headline: string
  if (result.caught) headline = youWereImposter ? 'You were caught!' : `Caught! ${imposter} was the imposter.`
  else headline = youWereImposter ? 'You got away with it!' : `${imposter} was the imposter, and got away.`

  const tally = [...room.players]
    .sort((a, b) => (result.votesAgainst[b.id] ?? 0) - (result.votesAgainst[a.id] ?? 0))
    .map((p) =>
      h(
        'li',
        { class: p.id === result.imposterId ? 'imposter' : '' },
        h('span', { class: 'name' }, p.name),
        p.id === result.imposterId && h('span', { class: 'tag' }, 'imposter'),
        h('span', { class: 'votes' }, `${result.votesAgainst[p.id] ?? 0} votes`),
      ),
    )

  return h(
    'section',
    { class: 'panel' },
    h('h2', {}, headline),
    h('p', { class: 'reveal-word' }, 'The word was ', h('strong', {}, result.word)),
    h('ol', { class: 'tally' }, ...tally),
    isHost(room) ? button('Play again', actions.playAgain, 'primary') : h('p', { class: 'hint' }, 'Waiting for the host…'),
  )
}
