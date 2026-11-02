import { DurableObject } from 'cloudflare:workers'
import {
  addPlayer,
  createRoom,
  DISCONNECT_GRACE_MS,
  isGameId,
  isValidRoomCode,
  MAX_MESSAGE_BYTES,
  normalizeNickname,
  parseClientMessage,
  pruneDisconnected,
  publicRoom,
  ROOM_CODE_ALPHABET,
  type RoomPlayer,
  type RoomState,
} from './room-model'

interface Env {
  ROOMS: DurableObjectNamespace<RoomDurableObject>
  ALLOWED_ORIGINS: string
  ROOM_TOKEN_SECRET?: string
}

type PendingMode = 'create' | 'join'
type SocketAttachment = { mode: PendingMode; roomCode: string; playerId?: string; room?: RoomState }
type TokenClaims = { version: 1; roomCode: string; playerId: string; nickname: string; expiresAt: number }
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}

function originAllowed(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin')
  if (!origin) return null
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  return allowed.includes(origin) ? origin : null
}

function makeRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (value) => ROOM_CODE_ALPHABET[value & 31]).join('')
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 })

    const origin = originAllowed(request, env)
    if (url.pathname === '/api/health' && request.method === 'GET') {
      if (request.headers.has('Origin') && !origin) return Response.json({ error: 'origin_not_allowed' }, { status: 403 })
      return Response.json({ status: 'ok' }, { headers: origin ? corsHeaders(origin) : {} })
    }
    if (!origin) return Response.json({ error: 'origin_not_allowed' }, { status: 403 })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })

    if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return Response.json({ error: 'websocket_required' }, { status: 426, headers: corsHeaders(origin) })
    }

    let mode: PendingMode
    let code: string
    if (url.pathname === '/api/rooms/create') {
      mode = 'create'
      code = makeRoomCode()
    } else {
      const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})$/i)
      if (!match) return Response.json({ error: 'invalid_room_code' }, { status: 400, headers: corsHeaders(origin) })
      code = match[1].toUpperCase()
      if (!isValidRoomCode(code)) return Response.json({ error: 'invalid_room_code' }, { status: 400, headers: corsHeaders(origin) })
      mode = 'join'
    }

    const id = env.ROOMS.idFromName(code)
    const stub = env.ROOMS.get(id)
    const headers = new Headers(request.headers)
    headers.set('X-Ufuk-Room-Action', mode)
    headers.set('X-Ufuk-Room-Code', code)
    headers.set('X-Ufuk-Verified-Origin', origin)
    const internalUrl = new URL('https://room.internal/socket')
    const response = await stub.fetch(new Request(internalUrl, { method: 'GET', headers }))
    return response
  },
} satisfies ExportedHandler<Env>

export default worker

export class RoomDurableObject extends DurableObject<Env> {
  private room: RoomState | null = null

  async fetch(request: Request): Promise<Response> {
    const mode = request.headers.get('X-Ufuk-Room-Action')
    const code = request.headers.get('X-Ufuk-Room-Code')
    const origin = request.headers.get('X-Ufuk-Verified-Origin')
    if (mode !== 'create' && mode !== 'join' || !code || !isValidRoomCode(code) || !origin) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return Response.json({ error: 'websocket_required' }, { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    this.ctx.acceptWebSocket(server)
    const attachment: SocketAttachment = { mode, roomCode: code }
    server.serializeAttachment(attachment)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(socket: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const attachment = this.attachment(socket)
    if (!attachment) return this.reject(socket, 'connection_invalid')
    const message = parseClientMessage(data)
    if (!message) {
      const tooLarge = typeof data === 'string' && new TextEncoder().encode(data).byteLength > MAX_MESSAGE_BYTES
      return this.reject(socket, tooLarge ? 'message_too_large' : 'invalid_message', tooLarge ? 1009 : 1008)
    }

    if (message.type === 'ping') {
      socket.send(JSON.stringify({ type: 'pong' }))
      return
    }
    if (message.type === 'leave') {
      if (attachment.playerId) this.removePlayer(attachment.playerId)
      socket.close(1000, 'left')
      return
    }
    if (attachment.playerId) return this.reject(socket, 'already_joined')

    const nickname = normalizeNickname(message.nickname)
    if (!nickname) return this.reject(socket, 'invalid_nickname')
    if (!this.env.ROOM_TOKEN_SECRET || this.env.ROOM_TOKEN_SECRET.length < 32) return this.reject(socket, 'server_configuration', 1011)
    const current = this.restoreRoom(attachment.roomCode)

    if (message.type === 'create') {
      if (attachment.mode !== 'create' || !isGameId(message.gameId)) return this.reject(socket, 'invalid_message')
      if (current) return this.reject(socket, 'room_code_conflict', 4009)
      const playerId = crypto.randomUUID()
      this.room = createRoom(attachment.roomCode, message.gameId, nickname, playerId)
      const token = await this.issueToken(attachment.roomCode, playerId, nickname)
      this.attachRoomToSockets()
      socket.serializeAttachment({ ...attachment, playerId, room: this.cloneRoom(this.room) } satisfies SocketAttachment)
      socket.send(JSON.stringify({ type: 'welcome', sessionToken: token, playerId, room: publicRoom(this.room) }))
      return
    }

    if (attachment.mode !== 'join') return this.reject(socket, 'invalid_message')
    if (!current) return this.reject(socket, 'room_not_found', 4004)
    this.room = pruneDisconnected(current, Date.now())

    let player: RoomPlayer | undefined
    let claims: TokenClaims | null = null
    if (message.resumeToken) {
      claims = await this.verifyToken(message.resumeToken)
      if (!claims || claims.roomCode !== attachment.roomCode || claims.nickname !== nickname) return this.reject(socket, 'session_expired')
      player = this.room.players.find((item) => item.id === claims?.playerId)
      if (!player || player.nickname !== claims.nickname || claims.expiresAt < Date.now()) return this.reject(socket, 'session_expired')
      if (player.connected) return this.reject(socket, 'already_connected')
      player = { ...player, connected: true, disconnectedAt: null }
      this.room = { ...this.room, players: this.room.players.map((item) => item.id === player?.id ? player : item) }
    } else {
      if (normalizeNickname(message.nickname) !== nickname) return this.reject(socket, 'invalid_nickname')
      const result = addPlayer(this.room, nickname, crypto.randomUUID(), Date.now())
      if (result.error) return this.reject(socket, result.error)
      this.room = result.room
      player = this.room?.players.at(-1)
    }

    if (!player || !this.room) return this.reject(socket, 'room_not_found')
    const token = await this.issueToken(attachment.roomCode, player.id, player.nickname)
    socket.serializeAttachment({ ...attachment, playerId: player.id, room: this.cloneRoom(this.room) } satisfies SocketAttachment)
    this.attachRoomToSockets()
    socket.send(JSON.stringify({ type: 'welcome', sessionToken: token, playerId: player.id, room: publicRoom(this.room) }))
    this.broadcast({ type: 'room_update', room: publicRoom(this.room) }, socket)
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    const attachment = this.attachment(socket)
    if (!attachment?.playerId) return
    const room = this.restoreRoom(attachment.roomCode)
    if (!room) return
    const connectedIds = new Set(this.connectedSockets().filter((item) => item !== socket).map((item) => this.attachment(item)?.playerId).filter((id): id is string => Boolean(id)))
    const player = room.players.find((item) => item.id === attachment.playerId)
    if (!player || !player.connected) return
    this.room = { ...room, players: room.players.map((item) => item.id === player.id ? { ...item, connected: false, disconnectedAt: Date.now() } : item) }
    this.room = pruneDisconnected(this.room, Date.now())
    if (connectedIds.size === 0) {
      this.scheduleDisconnectCleanup(attachment.roomCode)
      return
    }
    this.attachRoomToSockets()
    this.broadcast({ type: 'room_update', room: publicRoom(this.room) })
    this.scheduleDisconnectCleanup(attachment.roomCode)
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    await this.webSocketClose(socket)
  }

  private restoreRoom(code: string): RoomState | null {
    if (this.room?.code === code) return this.room
    for (const socket of this.connectedSockets()) {
      const saved = this.attachment(socket)?.room
      if (saved?.code === code) {
        this.room = this.cloneRoom(saved)
        const connectedIds = new Set(this.connectedSockets().map((item) => this.attachment(item)?.playerId).filter((id): id is string => Boolean(id)))
        this.room.players = this.room.players.map((player) => connectedIds.has(player.id)
          ? { ...player, connected: true, disconnectedAt: null }
          : player.connected ? { ...player, connected: false, disconnectedAt: Date.now() } : player)
        this.room = pruneDisconnected(this.room, Date.now())
        return this.room
      }
    }
    this.room = null
    return null
  }

  private connectedSockets(): WebSocket[] {
    return this.ctx.getWebSockets()
  }

  private attachment(socket: WebSocket): SocketAttachment | null {
    const value = socket.deserializeAttachment() as SocketAttachment | null
    return value && typeof value.roomCode === 'string' ? value : null
  }

  private cloneRoom(room: RoomState): RoomState {
    return { ...room, players: room.players.map((player) => ({ ...player })) }
  }

  private attachRoomToSockets(): void {
    if (!this.room) return
    const room = this.cloneRoom(this.room)
    for (const socket of this.connectedSockets()) {
      const attachment = this.attachment(socket)
      if (attachment?.playerId && this.room.players.some((player) => player.id === attachment.playerId)) {
        socket.serializeAttachment({ ...attachment, room } satisfies SocketAttachment)
      }
    }
  }

  private broadcast(message: unknown, except?: WebSocket): void {
    const serialized = JSON.stringify(message)
    for (const socket of this.connectedSockets()) {
      if (socket !== except && this.attachment(socket)?.playerId) {
        try { socket.send(serialized) } catch { /* The close handler will reconcile a stale socket. */ }
      }
    }
  }

  private removePlayer(playerId: string): void {
    const room = this.room
    if (!room) return
    const players = room.players.filter((player) => player.id !== playerId)
    if (players.length === 0) {
      this.room = null
      return
    }
    const ownerId = room.ownerId === playerId ? players.find((player) => player.connected)?.id ?? players[0].id : room.ownerId
    this.room = { ...room, ownerId, players }
    this.attachRoomToSockets()
    this.broadcast({ type: 'room_update', room: publicRoom(this.room) })
  }

  private scheduleDisconnectCleanup(roomCode: string): void {
    setTimeout(() => {
      const room = this.room?.code === roomCode ? this.room : this.restoreRoom(roomCode)
      if (!room) return
      this.room = pruneDisconnected(room, Date.now())
      if (this.room.players.length === 0) {
        this.room = null
        return
      }
      this.attachRoomToSockets()
      this.broadcast({ type: 'room_update', room: publicRoom(this.room) })
    }, DISCONNECT_GRACE_MS)
  }

  private reject(socket: WebSocket, code: string, closeCode = 1008): void {
    try {
      socket.send(JSON.stringify({ type: 'error', code }))
      socket.close(closeCode, code)
    } catch { /* Socket already closed. */ }
  }

  private async issueToken(roomCode: string, playerId: string, nickname: string): Promise<string> {
    const secret = this.env.ROOM_TOKEN_SECRET
    if (!secret || secret.length < 32) throw new Error('ROOM_TOKEN_SECRET must be configured with at least 32 characters')
    const claims: TokenClaims = { version: 1, roomCode, playerId, nickname, expiresAt: Date.now() + TOKEN_TTL_MS }
    const payload = this.base64Url(new TextEncoder().encode(JSON.stringify(claims)))
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    return `${payload}.${this.base64Url(new Uint8Array(signature))}`
  }

  private async verifyToken(token: string): Promise<TokenClaims | null> {
    const secret = this.env.ROOM_TOKEN_SECRET
    const [payload, signature, extra] = token.split('.')
    if (!secret || secret.length < 32 || !payload || !signature || extra !== undefined) return null
    try {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
      const verified = await crypto.subtle.verify('HMAC', key, this.fromBase64Url(signature), new TextEncoder().encode(payload))
      if (!verified) return null
      const claims = JSON.parse(new TextDecoder().decode(this.fromBase64Url(payload))) as TokenClaims
      if (claims.version !== 1 || !isValidRoomCode(claims.roomCode) || typeof claims.playerId !== 'string' || typeof claims.nickname !== 'string' || typeof claims.expiresAt !== 'number') return null
      return claims
    } catch { return null }
  }

  private base64Url(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }

  private fromBase64Url(value: string): Uint8Array {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  }
}
