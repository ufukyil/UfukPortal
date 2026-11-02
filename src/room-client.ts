export type RoomPlayer = { id: string; nickname: string; connected: boolean; isOwner: boolean }
export type TriviaSnapshot = {
  status: 'lobby' | 'playing' | 'finished'
  questionIndex: number
  question: { prompt: string; options: string[] } | null
  scores: { playerId: string; nickname: string; score: number }[]
  answeredPlayerIds: string[]
  totalQuestions: number
}
export type RoomSnapshot = { code: string; gameId: string; players: RoomPlayer[]; trivia: TriviaSnapshot }
export type RoomStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'
export type ConnectOptions = { mode: 'create'; nickname: string; gameId: string } | { mode: 'join'; nickname: string; code: string; resumeToken?: string }

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '') ?? ''

export function roomSocketUrl(path: string): string {
  const base = API_BASE_URL || window.location.origin
  const url = new URL(path, base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

export function roomErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    room_not_found: 'Bu kodla açık bir oda bulunamadı. Oda kodunu kontrol et.',
    room_full: 'Oda dolu. Bir oda en fazla 8 oyuncu alabilir.',
    nickname_taken: 'Bu takma ad odada kullanılıyor. Başka bir ad seç.',
    invalid_nickname: 'Takma ad 2–20 karakter olmalı; harf, rakam, boşluk, _ veya - kullan.',
    invalid_game: 'Seçilen oyun tanınmadı.',
    invalid_message: 'Sunucuya geçersiz bir istek gönderildi.',
    unauthorized_action: 'Oyunu yalnızca oda sahibi başlatabilir.',
    game_already_started: 'Oyun zaten başlatılmış.',
    game_not_playing: 'Şu anda cevap gönderilebilecek bir oyun yok.',
    question_source_unavailable: 'Sorular internetten alınamadı. Biraz sonra tekrar oyunu başlatmayı dene.',
    already_answered: 'Bu soruyu zaten cevapladın.',
    session_expired: 'Oturumun sona erdi. Odaya takma adınla yeniden katıl.',
    already_connected: 'Bu oyuncu zaten bağlı.',
    already_joined: 'Bu bağlantı odaya zaten katılmış.',
    room_code_conflict: 'Oda kodu çakıştı; yeni bir kod deneniyor.',
    server_configuration: 'Oda sunucusu henüz yapılandırılmamış.',
    message_too_large: 'Gönderilen mesaj izin verilen boyutu aşıyor.',
    origin_not_allowed: 'Bu sayfanın oda sunucusuna bağlanmasına izin verilmiyor.',
    connection_invalid: 'Bağlantı doğrulanamadı.',
  }
  return messages[code] ?? 'Oda sunucusuna bağlanılamadı. Biraz sonra tekrar dene.'
}

export function sessionStorageKey(code: string): string { return `ufukportal:room:${code}` }
