import { useCallback, useEffect, useRef, useState } from 'react'
import { roomErrorMessage, roomSocketUrl, sessionStorageKey, type ConnectOptions, type RoomSnapshot, type RoomStatus } from './room-client'

type ServerMessage =
  | { type: 'welcome'; sessionToken: string; playerId: string; room: RoomSnapshot }
  | { type: 'room_update'; room: RoomSnapshot }
  | { type: 'error'; code: string }
  | { type: 'pong' }

export function useRoomConnection() {
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [playerId, setPlayerId] = useState('')
  const [status, setStatus] = useState<RoomStatus>('idle')
  const [error, setError] = useState('')
  const roomRef = useRef<RoomSnapshot | null>(room)
  const serverErrorRef = useRef('')
  roomRef.current = room
  const socketRef = useRef<WebSocket | null>(null)
  const attemptRef = useRef(0)
  const retryTimerRef = useRef<number | undefined>(undefined)
  const connectTimeoutRef = useRef<number | undefined>(undefined)
  const optionsRef = useRef<ConnectOptions | null>(null)
  const retriesRef = useRef(0)
  const manualLeaveRef = useRef(false)
  const activeRef = useRef(false)

  const clearTimers = useCallback(() => {
    if (retryTimerRef.current !== undefined) window.clearTimeout(retryTimerRef.current)
    if (connectTimeoutRef.current !== undefined) window.clearTimeout(connectTimeoutRef.current)
    retryTimerRef.current = undefined
    connectTimeoutRef.current = undefined
  }, [])

  const connect = useCallback((options: ConnectOptions, isReconnect = false) => {
    clearTimers()
    const attempt = ++attemptRef.current
    manualLeaveRef.current = false
    activeRef.current = true
    optionsRef.current = options
    serverErrorRef.current = ''
    setError('')
    setStatus(isReconnect ? 'reconnecting' : 'connecting')

    let socket: WebSocket
    try {
      const path = options.mode === 'create' ? '/api/rooms/create' : `/api/rooms/${encodeURIComponent(options.code)}`
      socket = new WebSocket(roomSocketUrl(path))
    } catch {
      setStatus('error')
      setError(roomErrorMessage('connection_failed'))
      return
    }
    socketRef.current = socket

    connectTimeoutRef.current = window.setTimeout(() => {
      if (attempt === attemptRef.current && socket.readyState === WebSocket.CONNECTING) socket.close()
    }, 8000)

    socket.onopen = () => {
      if (attempt !== attemptRef.current) return
      if (connectTimeoutRef.current !== undefined) window.clearTimeout(connectTimeoutRef.current)
      const message = options.mode === 'create'
        ? { type: 'create', nickname: options.nickname, gameId: options.gameId }
        : { type: 'join', nickname: options.nickname, ...(options.resumeToken ? { resumeToken: options.resumeToken } : {}) }
      socket.send(JSON.stringify(message))
    }

    socket.onmessage = (event) => {
      if (attempt !== attemptRef.current || typeof event.data !== 'string' || event.data.length > 4096) return
      let message: ServerMessage
      try { message = JSON.parse(event.data) as ServerMessage } catch { return }
      if (message.type === 'welcome') {
        if (!message.room?.code || !Array.isArray(message.room.players) || typeof message.sessionToken !== 'string' || typeof message.playerId !== 'string') return
        setRoom(message.room)
        roomRef.current = message.room
        setPlayerId(message.playerId)
        setStatus('connected')
        setError('')
        retriesRef.current = 0
        const joined: ConnectOptions = { mode: 'join', code: message.room.code, nickname: options.nickname, resumeToken: message.sessionToken }
        optionsRef.current = joined
        try { window.sessionStorage.setItem(sessionStorageKey(message.room.code), message.sessionToken) } catch { /* The current connection remains usable without tab storage. */ }
      } else if (message.type === 'room_update') {
        setRoom(message.room)
        roomRef.current = message.room
      } else if (message.type === 'error') {
        if (message.code === 'room_code_conflict' && options.mode === 'create' && retriesRef.current < 4) {
          retriesRef.current += 1
          connect(options, false)
          return
        }
        serverErrorRef.current = message.code
        setStatus('error')
        setError(roomErrorMessage(message.code))
      }
    }

    socket.onerror = () => {
      if (attempt === attemptRef.current && activeRef.current && room === null) setStatus('connecting')
    }

    socket.onclose = (event) => {
      if (attempt !== attemptRef.current) return
      if (connectTimeoutRef.current !== undefined) window.clearTimeout(connectTimeoutRef.current)
      if (!activeRef.current || manualLeaveRef.current) return
      if (event.reason === 'room_code_conflict' && options.mode === 'create' && retriesRef.current < 4) {
        retriesRef.current += 1
        connect(options, false)
        return
      }
      if (serverErrorRef.current) {
        setStatus('error')
        setError(roomErrorMessage(serverErrorRef.current))
        return
      }
      if (roomRef.current !== null || isReconnect) {
        if (retriesRef.current < 5) {
          retriesRef.current += 1
          setStatus('reconnecting')
          setError('Bağlantı kesildi. Yeniden bağlanılıyor…')
          const retryOptions = optionsRef.current
          const delay = Math.min(1000 * 2 ** (retriesRef.current - 1), 8000)
          retryTimerRef.current = window.setTimeout(() => {
            if (retryOptions && activeRef.current) connect(retryOptions, true)
          }, delay)
        } else {
          setStatus('error')
          setError('Sunucuya yeniden bağlanılamadı. Bağlantını kontrol edip tekrar dene.')
        }
      } else {
        setStatus('error')
        setError(roomErrorMessage('connection_failed'))
      }
    }
  }, [clearTimers])

  const createRoom = useCallback((nickname: string, gameId: string) => {
    retriesRef.current = 0
    setRoom(null)
    roomRef.current = null
    setPlayerId('')
    connect({ mode: 'create', nickname, gameId })
  }, [connect])

  const joinRoom = useCallback((nickname: string, code: string) => {
    retriesRef.current = 0
    setRoom(null)
    roomRef.current = null
    setPlayerId('')
    const normalizedCode = code.trim().toUpperCase()
    if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(normalizedCode)) {
      setStatus('error')
      setError('Oda kodu 6 karakter olmalı. Kodda 0, 1, I ve O kullanılmaz.')
      return
    }
    let resumeToken: string | undefined
    try { resumeToken = window.sessionStorage.getItem(sessionStorageKey(normalizedCode)) ?? undefined } catch { /* Storage may be disabled. */ }
    connect({ mode: 'join', nickname, code: normalizedCode, resumeToken })
  }, [connect])

  const leaveRoom = useCallback(() => {
    manualLeaveRef.current = true
    activeRef.current = false
    clearTimers()
    attemptRef.current += 1
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) {
      try { socket.send(JSON.stringify({ type: 'leave' })) } catch { /* Closing the socket still removes this connection. */ }
      socket.close(1000, 'left')
    } else if (socket && socket.readyState !== WebSocket.CLOSED) socket.close()
    const code = room?.code
    if (code) {
      try { window.sessionStorage.removeItem(sessionStorageKey(code)) } catch { /* Ignore unavailable session storage. */ }
    }
    optionsRef.current = null
    setRoom(null)
    setStatus('idle')
    setError('')
  }, [clearTimers, room?.code])

  const retry = useCallback(() => {
    const options = optionsRef.current
    if (!options) return
    retriesRef.current = 0
    connect(options, Boolean(room))
  }, [connect, room])

  const sendGameCommand = useCallback((message: { type: 'start_game' } | { type: 'submit_answer'; answerIndex: number }) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN || status !== 'connected') {
      setError('Oyun komutu gönderilemedi. Bağlantını kontrol et.')
      return false
    }
    socket.send(JSON.stringify(message))
    return true
  }, [status])

  const startGame = useCallback(() => sendGameCommand({ type: 'start_game' }), [sendGameCommand])
  const submitAnswer = useCallback((answerIndex: number) => sendGameCommand({ type: 'submit_answer', answerIndex }), [sendGameCommand])

  useEffect(() => () => {
    activeRef.current = false
    clearTimers()
    socketRef.current?.close()
  }, [clearTimers])

  return { room, playerId, status, error, createRoom, joinRoom, leaveRoom, retry, startGame, submitAnswer }
}
