import '../../shared/src/page.css'
import '../../shared/src/rooms/rooms.css'
import './style.css'
import { h } from '../../shared/src/rooms/dom'
import { lobbyView } from '../../shared/src/rooms/lobby'
import { startRoomPage } from '../../shared/src/rooms/page'
import { withSampleTimer } from '../../shared/src/rooms/preview'
import { sampleClues, sampleImposter, sampleLobby, sampleResult, sampleVote, sampleVoted, sampleYourTurn } from './fixtures'
import { type ClientMessage, MAX_PLAYERS, MIN_PLAYERS, type RoomView } from './protocol'
import { type ImposterActions, imposterView } from './views'

const LIMITS = { min: MIN_PLAYERS, max: MAX_PLAYERS }
const noActions: ImposterActions = { clue: () => {}, vote: () => {}, playAgain: () => {} }

// One input per clue turn, so a half-typed clue survives other players' updates.
let clueKey = ''
let clueInput = h('input', { type: 'text', autocomplete: 'off' })

function inputFor(room: RoomView): HTMLInputElement {
  const key = `${room.code}:${room.phase}:${room.turnId}`
  if (key !== clueKey) {
    clueKey = key
    clueInput = h('input', { type: 'text', autocomplete: 'off' })
  }
  return clueInput
}

const preview = (room: RoomView, timer?: string) => withSampleTimer(imposterView(room, inputFor(room), noActions), timer)

startRoomPage<RoomView, ClientMessage>({
  game: 'imposter',
  playerRange: '3 to 10 players',
  limits: LIMITS,
  render: (room, ctx) =>
    imposterView(room, inputFor(room), {
      clue: (text) => text && ctx.send({ type: 'clue', text }),
      vote: (targetId) => ctx.send({ type: 'vote', targetId }),
      playAgain: () => ctx.send({ type: 'playAgain' }),
    }),
  preview: () => [
    { label: 'Lobby', render: () => lobbyView(sampleLobby, LIMITS, { start: () => {}, copyLink: () => {} }) },
    { label: 'Clues', render: () => preview(sampleClues, '0:18') },
    { label: 'Your turn', render: () => preview(sampleYourTurn, '0:25') },
    { label: 'As imposter', render: () => preview(sampleImposter, '0:18') },
    { label: 'Vote', render: () => preview(sampleVote, '0:40') },
    { label: 'Voted', render: () => preview(sampleVoted, '0:31') },
    { label: 'Result', render: () => preview(sampleResult) },
  ],
})
