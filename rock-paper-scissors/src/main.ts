import '../../shared/src/page.css'
import '../../shared/src/rooms/rooms.css'
import './style.css'
import { lobbyView } from '../../shared/src/rooms/lobby'
import { startRoomPage } from '../../shared/src/rooms/page'
import { withSampleTimer } from '../../shared/src/rooms/preview'
import { sampleChoose, sampleLobby, sampleLocked, sampleOver, sampleReveal } from './fixtures'
import { type ClientMessage, PLAYERS, type RoomView } from './protocol'
import { type DuelActions, duelView } from './views'

const LIMITS = { min: PLAYERS, max: PLAYERS }
const noActions: DuelActions = { play: () => {}, next: () => {}, rematch: () => {} }

startRoomPage<RoomView, ClientMessage>({
  game: 'rps',
  playerRange: '2 players',
  limits: LIMITS,
  render: (room, ctx) =>
    duelView(room, {
      play: (move) => ctx.send({ type: 'play', move }),
      next: () => ctx.send({ type: 'next' }),
      rematch: () => ctx.send({ type: 'rematch' }),
    }),
  preview: () => [
    { label: 'Lobby', render: () => lobbyView(sampleLobby, LIMITS, { start: () => {}, copyLink: () => {} }) },
    { label: 'Choose', render: () => withSampleTimer(duelView(sampleChoose, noActions), '0:08') },
    { label: 'Locked in', render: () => withSampleTimer(duelView(sampleLocked, noActions), '0:05') },
    { label: 'Reveal', render: () => duelView(sampleReveal, noActions) },
    { label: 'Match over', render: () => duelView(sampleOver, noActions) },
  ],
})
