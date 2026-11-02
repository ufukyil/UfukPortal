export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/
export const MAX_PLAYERS = 8
export const MAX_MESSAGE_BYTES = 2048
export const DISCONNECT_GRACE_MS = 30_000

export type GameId = 'charades' | 'trivia' | 'movie'
export type RoomPlayer = {
  id: string
  nickname: string
  connected: boolean
  disconnectedAt: number | null
}
export type TriviaQuestion = { prompt: string; options: string[]; answerIndex: number }
export type TriviaGame = { status: 'lobby' | 'playing' | 'finished'; questionIndex: number; questions: TriviaQuestion[]; scores: Record<string, number>; answered: string[] }
export type RoomState = {
  code: string
  gameId: GameId
  ownerId: string
  players: RoomPlayer[]
  trivia: TriviaGame
}
export type RoomError = 'invalid_nickname' | 'invalid_game' | 'room_not_found' | 'room_full' | 'nickname_taken' | 'already_connected'
export type ClientMessage =
  | { type: 'create'; nickname: string; gameId: GameId }
  | { type: 'join'; nickname: string; resumeToken?: string }
  | { type: 'start_game' }
  | { type: 'submit_answer'; answerIndex: number; questionIndex: number }
  | { type: 'leave' }
  | { type: 'ping' }

const validGameIds = new Set<GameId>(['charades', 'trivia', 'movie'])

export function normalizeNickname(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const nickname = value.trim().replace(/\s+/g, ' ')
  if (nickname.length < 2 || nickname.length > 20 || !/^[\p{L}\p{N} _-]+$/u.test(nickname)) return null
  return nickname
}

export function isValidRoomCode(value: unknown): value is string {
  return typeof value === 'string' && ROOM_CODE_PATTERN.test(value)
}

export function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && validGameIds.has(value as GameId)
}

export function parseClientMessage(data: string | ArrayBuffer): ClientMessage | null {
  if (typeof data !== 'string' || new TextEncoder().encode(data).byteLength > MAX_MESSAGE_BYTES) return null
  let value: unknown
  try { value = JSON.parse(data) } catch { return null }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const message = value as Record<string, unknown>
  if (message.type === 'create' && Object.keys(message).length === 3 && typeof message.nickname === 'string' && isGameId(message.gameId)) {
    return { type: 'create', nickname: message.nickname, gameId: message.gameId }
  }
  if (message.type === 'join' && (Object.keys(message).length === 2 || Object.keys(message).length === 3) && typeof message.nickname === 'string' && (message.resumeToken === undefined || (typeof message.resumeToken === 'string' && message.resumeToken.length <= 512))) {
    return message.resumeToken === undefined
      ? { type: 'join', nickname: message.nickname }
      : { type: 'join', nickname: message.nickname, resumeToken: message.resumeToken }
  }
  if (message.type === 'start_game' && Object.keys(message).length === 1) return { type: 'start_game' }
  if (message.type === 'submit_answer' && Object.keys(message).length === 3 && Number.isInteger(message.answerIndex) && (message.answerIndex as number) >= 0 && (message.answerIndex as number) <= 3 && Number.isInteger(message.questionIndex) && (message.questionIndex as number) >= 0) return { type: 'submit_answer', answerIndex: message.answerIndex as number, questionIndex: message.questionIndex as number }
  if ((message.type === 'leave' || message.type === 'ping') && Object.keys(message).length === 1) return { type: message.type }
  return null
}

export function createRoom(code: string, gameId: GameId, nickname: string, playerId: string): RoomState {
  return { code, gameId, ownerId: playerId, players: [{ id: playerId, nickname, connected: true, disconnectedAt: null }], trivia: { status: 'lobby', questionIndex: 0, questions: [], scores: { [playerId]: 0 }, answered: [] } }
}

export function pruneDisconnected(room: RoomState, now: number): RoomState {
  const players = room.players.filter((player) => player.connected || player.disconnectedAt === null || now - player.disconnectedAt < DISCONNECT_GRACE_MS)
  const ownerId = players.some((player) => player.id === room.ownerId)
    ? room.ownerId
    : (players.find((player) => player.connected) ?? players[0])?.id ?? ''
  return { ...room, ownerId, players }
}

export function addPlayer(room: RoomState | null, nickname: string, playerId: string, now: number): { room: RoomState | null; error: RoomError | null } {
  if (!room) return { room: null, error: 'room_not_found' }
  const current = pruneDisconnected(room, now)
  if (current.players.some((player) => player.nickname.toLocaleLowerCase('tr') === nickname.toLocaleLowerCase('tr'))) return { room: current, error: 'nickname_taken' }
  if (current.players.length >= MAX_PLAYERS) return { room: current, error: 'room_full' }
  return { room: { ...current, players: [...current.players, { id: playerId, nickname, connected: true, disconnectedAt: null }], trivia: { ...current.trivia, scores: { ...current.trivia.scores, [playerId]: 0 } } }, error: null }
}

export function publicRoom(room: RoomState) {
  return {
    code: room.code,
    gameId: room.gameId,
    players: room.players.map(({ id, nickname, connected }) => ({ id, nickname, connected, isOwner: id === room.ownerId })),
    trivia: {
      status: room.trivia.status,
      questionIndex: room.trivia.questionIndex,
      question: room.trivia.status === 'playing' ? { prompt: room.trivia.questions[room.trivia.questionIndex].prompt, options: room.trivia.questions[room.trivia.questionIndex].options } : null,
      scores: room.players.map(({ id, nickname }) => ({ playerId: id, nickname, score: room.trivia.scores[id] ?? 0 })),
      answeredPlayerIds: [...room.trivia.answered],
      totalQuestions: room.trivia.questions.length,
    },
  }
}

