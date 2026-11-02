import { afterEach, describe, expect, it } from 'vitest'
import { exports } from 'cloudflare:workers'
import { addPlayer, createRoom, isValidRoomCode, parseClientMessage, publicRoom } from '../worker/room-model'

const origin = 'http://localhost:5173'
const sockets: WebSocket[] = []

afterEach(() => {
  for (const socket of sockets.splice(0)) {
    try { socket.close(1000, 'test_finished') } catch { /* Already closed. */ }
  }
})

async function openSocket(path: string): Promise<WebSocket> {
  const response = await exports.default.fetch(new Request(`https://portal.test${path}`, {
    headers: { Origin: origin, Upgrade: 'websocket' },
  }))
  expect(response.status).toBe(101)
  if (!response.webSocket) throw new Error('Worker did not return a WebSocket')
  const socket = response.webSocket
  socket.accept()
  sockets.push(socket)
  return socket
}

function nextMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WebSocket message timed out')), 1500)
    socket.addEventListener('message', (event) => {
      clearTimeout(timeout)
      resolve(JSON.parse(String(event.data)) as Record<string, unknown>)
    }, { once: true })
  })
}

async function sendAndRead(socket: WebSocket, value: unknown) {
  const received = nextMessage(socket)
  socket.send(JSON.stringify(value))
  return received
}

async function createTestRoom() {
  const socket = await openSocket('/api/rooms/create')
  const response = await sendAndRead(socket, { type: 'create', nickname: 'Ev Sahibi', gameId: 'charades' })
  expect(response.type).toBe('welcome')
  return { socket, code: (response.room as { code: string }).code }
}

describe('oda kuralları', () => {
  it('oda oluşturur ve sahibini sunucu tarafında belirler', () => {
    const room = createRoom('ABC234', 'charades', 'Ev Sahibi', 'owner-1')
    expect(publicRoom(room).players[0]).toMatchObject({ id: 'owner-1', nickname: 'Ev Sahibi', isOwner: true })
    expect(isValidRoomCode('ABC234')).toBe(true)
    expect(isValidRoomCode('AB01IO')).toBe(false)
  })

  it('katılımda aynı takma adın çakışmasını engeller', () => {
    const room = createRoom('ABC234', 'trivia', 'Oyuncu', 'owner-1')
    expect(addPlayer(room, 'oyuncu', 'player-2', Date.now()).error).toBe('nickname_taken')
    expect(addPlayer(room, 'Başka Oyuncu', 'player-2', Date.now()).error).toBeNull()
  })

  it('yanlış oda koduyla oda bulunamadı yanıtı verir', () => {
    expect(addPlayer(null, 'Oyuncu', 'player-2', Date.now()).error).toBe('room_not_found')
  })

  it('oda kapasitesini 8 oyuncuda sınırlar', () => {
    let room = createRoom('ABC234', 'movie', 'Oyuncu 1', 'player-1')
    for (let index = 2; index <= 8; index += 1) {
      const result = addPlayer(room, `Oyuncu ${index}`, `player-${index}`, Date.now())
      expect(result.error).toBeNull()
      room = result.room!
    }
    expect(room.players).toHaveLength(8)
    expect(addPlayer(room, 'Dokuzuncu', 'player-9', Date.now()).error).toBe('room_full')
  })

  it('sahiplik sahteciliği ve bilinmeyen mesaj türlerini reddeder', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'create', nickname: 'Oyuncu', gameId: 'trivia', owner: true }))).toBeNull()
    expect(parseClientMessage(JSON.stringify({ type: 'set_owner', owner: true }))).toBeNull()
  })
})

describe('Worker ve Durable Object WebSocket akışı', () => {
  it('origin başlığı olmadan sağlık kontrolü sunar', async () => {
    const response = await exports.default.fetch(new Request('https://portal.test/api/health'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('izin verilen origin için oda oluşturur ve ikinci oyuncunun ekranını günceller', async () => {
    const owner = await openSocket('/api/rooms/create')
    const ownerWelcomePromise = nextMessage(owner)
    owner.send(JSON.stringify({ type: 'create', nickname: 'Ev Sahibi', gameId: 'charades' }))
    const ownerWelcome = await ownerWelcomePromise
    expect(ownerWelcome.playerId).toEqual(expect.any(String))
    const roomCode = (ownerWelcome.room as { code: string }).code
    expect(roomCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)

    const ownerUpdatePromise = nextMessage(owner)
    const guest = await openSocket(`/api/rooms/${roomCode}`)
    const guestWelcomePromise = nextMessage(guest)
    guest.send(JSON.stringify({ type: 'join', nickname: 'Misafir' }))
    const [guestWelcome, ownerUpdate] = await Promise.all([guestWelcomePromise, ownerUpdatePromise])
    expect(guestWelcome.type).toBe('welcome')
    expect(guestWelcome.playerId).toEqual(expect.any(String))
    expect(ownerUpdate.type).toBe('room_update')
    expect((ownerUpdate.room as { players: unknown[] }).players).toHaveLength(2)
  })

  it('geçerli biçimdeki ancak bulunmayan kodu reddeder', async () => {
    const guest = await openSocket('/api/rooms/ZZZZZZ')
    const response = await sendAndRead(guest, { type: 'join', nickname: 'Misafir' })
    expect(response).toEqual({ type: 'error', code: 'room_not_found' })
  })

  it('aynı takma adı veya aynı bağlantıdan ikinci üyeliği reddeder', async () => {
    const owner = await openSocket('/api/rooms/create')
    const first = await sendAndRead(owner, { type: 'create', nickname: 'Deniz', gameId: 'trivia' })
    const roomCode = (first.room as { code: string }).code

    const duplicateName = await openSocket(`/api/rooms/${roomCode}`)
    expect(await sendAndRead(duplicateName, { type: 'join', nickname: 'deniz' })).toEqual({ type: 'error', code: 'nickname_taken' })

    expect(await sendAndRead(owner, { type: 'create', nickname: 'Deniz', gameId: 'trivia' })).toEqual({ type: 'error', code: 'already_joined' })
  })

  it('kopan oyuncunun oturum biletiyle kısa süre içinde yeniden bağlanmasına izin verir', async () => {
    const owner = await openSocket('/api/rooms/create')
    const firstWelcome = await sendAndRead(owner, { type: 'create', nickname: 'Yeniden Bağlanan', gameId: 'movie' })
    const roomCode = (firstWelcome.room as { code: string }).code
    const playerId = firstWelcome.playerId
    const sessionToken = firstWelcome.sessionToken
    owner.close(1000, 'network_lost')
    await new Promise((resolve) => setTimeout(resolve, 30))

    const reconnected = await openSocket(`/api/rooms/${roomCode}`)
    const welcome = await sendAndRead(reconnected, { type: 'join', nickname: 'Yeniden Bağlanan', resumeToken: sessionToken })
    expect(welcome.type).toBe('welcome')
    expect(welcome.playerId).toBe(playerId)
  })

  it('sekizinci üyeden sonraki katılımı ve yetkisiz oda komutlarını reddeder', async () => {
    const owner = await openSocket('/api/rooms/create')
    const welcomePromise = nextMessage(owner)
    owner.send(JSON.stringify({ type: 'create', nickname: 'Oyuncu 1', gameId: 'trivia' }))
    const welcome = await welcomePromise
    const roomCode = (welcome.room as { code: string }).code

    for (let index = 2; index <= 8; index += 1) {
      const player = await openSocket(`/api/rooms/${roomCode}`)
      const result = sendAndRead(player, { type: 'join', nickname: `Oyuncu ${index}` })
      expect((await result).type).toBe('welcome')
    }

    const ninth = await openSocket(`/api/rooms/${roomCode}`)
    expect(await sendAndRead(ninth, { type: 'join', nickname: 'Oyuncu 9' })).toEqual({ type: 'error', code: 'room_full' })

    const unauthorized = await openSocket(`/api/rooms/${roomCode}`)
    expect(await sendAndRead(unauthorized, { type: 'set_owner', owner: true })).toEqual({ type: 'error', code: 'invalid_message' })
  })

  it('Genel Kültür oyununu başlatır, cevapları puanlar ve soruyu eş zamanlı ilerletir', async () => {
    const owner = await openSocket('/api/rooms/create')
    const ownerWelcome = await sendAndRead(owner, { type: 'create', nickname: 'Ev Sahibi', gameId: 'trivia' })
    const roomCode = (ownerWelcome.room as { code: string }).code
    const guest = await openSocket(`/api/rooms/${roomCode}`)
    await sendAndRead(guest, { type: 'join', nickname: 'Misafir' })

    const ownerStartUpdate = nextMessage(owner)
    const guestStartUpdate = nextMessage(guest)
    owner.send(JSON.stringify({ type: 'start_game' }))
    const [ownerStarted, guestStarted] = await Promise.all([ownerStartUpdate, guestStartUpdate])
    expect((ownerStarted.room as { trivia: { status: string; questionIndex: number } }).trivia).toMatchObject({ status: 'playing', questionIndex: 0 })
    expect((guestStarted.room as { trivia: { question: { prompt: string } } }).trivia.question.prompt).toContain('hangi yıl')

    const ownerAnswerUpdate = nextMessage(owner)
    const guestAnswerUpdate = nextMessage(guest)
    owner.send(JSON.stringify({ type: 'submit_answer', answerIndex: 1 }))
    const [ownerScored, guestScored] = await Promise.all([ownerAnswerUpdate, guestAnswerUpdate])
    expect((ownerScored.room as { trivia: { scores: { nickname: string; score: number }[] } }).trivia.scores.find((item) => item.nickname === 'Ev Sahibi')?.score).toBe(10)
    expect((guestScored.room as { trivia: { answeredPlayerIds: string[] } }).trivia.answeredPlayerIds).toHaveLength(1)

    const ownerNextUpdate = nextMessage(owner)
    const guestNextUpdate = nextMessage(guest)
    guest.send(JSON.stringify({ type: 'submit_answer', answerIndex: 0 }))
    const [ownerNext, guestNext] = await Promise.all([ownerNextUpdate, guestNextUpdate])
    expect((ownerNext.room as { trivia: { questionIndex: number } }).trivia.questionIndex).toBe(1)
    expect((guestNext.room as { trivia: { questionIndex: number } }).trivia.questionIndex).toBe(1)
  })

  it('reddeder origin dışı bağlantıları', async () => {
    const response = await exports.default.fetch(new Request('https://portal.test/api/health', { headers: { Origin: 'https://attacker.invalid' } }))
    expect(response.status).toBe(403)
  })
})
