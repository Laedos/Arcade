import '../../shared/src/page.css'
import '../../shared/src/rooms/rooms.css'
import './style.css'
import { lobbyView } from '../../shared/src/rooms/lobby'
import { startRoomPage } from '../../shared/src/rooms/page'
import { withSampleTimer } from '../../shared/src/rooms/preview'
import { sampleAnswer, sampleFinal, sampleLobby, sampleLocked, sampleQuestion, sampleScores } from './fixtures'
import { type ClientMessage, MAX_PLAYERS, MIN_PLAYERS, type RoomView } from './protocol'
import { type QuizActions, quizView } from './views'

const LIMITS = { min: MIN_PLAYERS, max: MAX_PLAYERS }
const noActions: QuizActions = { answer: () => {}, next: () => {}, playAgain: () => {} }

startRoomPage<RoomView, ClientMessage>({
  game: 'quiz',
  playerRange: '2 to 12 players',
  limits: LIMITS,
  render: (room, ctx) =>
    quizView(room, {
      answer: (choice) => room.question && ctx.send({ type: 'answer', question: room.question.number, choice }),
      next: () => ctx.send({ type: 'next' }),
      playAgain: () => ctx.send({ type: 'playAgain' }),
    }),
  preview: () => [
    { label: 'Lobby', render: () => lobbyView(sampleLobby, LIMITS, { start: () => {}, copyLink: () => {} }) },
    { label: 'Question', render: () => withSampleTimer(quizView(sampleQuestion, noActions), '0:12') },
    { label: 'Locked in', render: () => withSampleTimer(quizView(sampleLocked, noActions), '0:07') },
    { label: 'Answer', render: () => quizView(sampleAnswer, noActions) },
    { label: 'Scores', render: () => quizView(sampleScores, noActions) },
    { label: 'Final', render: () => quizView(sampleFinal, noActions) },
  ],
})
