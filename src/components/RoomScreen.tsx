import { useState } from 'react'
import type { RoomSnapshot, RoomStatus } from '../room-client'

type RoomScreenProps = {
  game: { title: string; tag: string; icon: string } | undefined
  room: RoomSnapshot | null
  playerId: string
  status: RoomStatus
  error: string
  onCreate: () => void
  onJoin: (code: string) => void
  onLeave: () => void
  onRetry: () => void
  onBack: () => void
  onStartGame: () => void
  onSubmitAnswer: (answerIndex: number) => void
}

const statusLabels: Record<RoomStatus, string> = {
  idle: 'Hazır',
  connecting: 'Bağlanıyor',
  connected: 'Bağlı',
  reconnecting: 'Yeniden bağlanıyor',
  error: 'Bağlantı sorunu',
}

export function RoomScreen({ game, room, playerId, status, error, onCreate, onJoin, onLeave, onRetry, onBack, onStartGame, onSubmitAnswer }: RoomScreenProps) {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    if (!room) return
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return <main className="room-page">
    <button className="back-link" onClick={onBack}>← Oyunlara dön</button>
    <div className="room-panel">
      <div className="room-game-icon">{game?.icon ?? '🎲'}</div>
      <div className="eyebrow section-eyebrow">{game?.tag ?? 'OYUN ODASI'}</div>
      <h1>{game?.title ?? 'Oda'}</h1>
      <p className="room-lead">{room ? 'Arkadaşlarınla aynı odadasın.' : 'Bir oda oluştur veya arkadaşının koduyla katıl.'}</p>

      {room ? <>
        <div className="room-code-card">
          <span>ODA KODU</span>
          <strong>{room.code}</strong>
          <button className="copy-code-button" onClick={copyCode} aria-label="Oda kodunu kopyala">{copied ? 'Kopyalandı ✓' : 'Kodu kopyala'}</button>
        </div>
        <div className={`room-connection ${status}`}><i /> {statusLabels[status]} <span>{room.players.length}/8 oyuncu</span></div>
        <section className="players-section" aria-label="Odadaki oyuncular">
          <div className="players-heading"><h2>Oyuncular</h2><span>{room.players.filter((player) => player.connected).length} çevrim içi</span></div>
          <ul className="players-list">{room.players.map((player) => <li key={player.id} className={!player.connected ? 'player-disconnected' : ''}>
            <span className="player-avatar">{player.nickname.slice(0, 1).toLocaleUpperCase('tr')}</span>
            <span className="player-name">{player.nickname}{player.id === playerId && <small>Sen</small>}</span>
            {player.isOwner && <span className="owner-badge">ODA SAHİBİ</span>}
            {!player.connected && <span className="offline-label">Yeniden bağlanıyor</span>}
          </li>)}</ul>
        </section>
        {room.gameId === 'trivia' && <section className="trivia-game" aria-live="polite">
          {room.trivia.status === 'lobby' && <>
            <div className="trivia-intro"><span>💡</span><div><b>Genel Kültür hazır!</b><p>10 soru, her doğru cevap 10 puan. Herkes cevaplayınca sonraki soru açılır.</p></div></div>
            {room.players.find((player) => player.id === playerId)?.isOwner
              ? <button className="primary-button trivia-start" onClick={onStartGame}>Oyunu Başlat <span>→</span></button>
              : <p className="trivia-waiting">Oda sahibinin oyunu başlatması bekleniyor…</p>}
          </>}
          {room.trivia.status === 'playing' && room.trivia.question && <>
            <div className="trivia-progress">SORU {room.trivia.questionIndex + 1} / {room.trivia.totalQuestions}<span>{room.trivia.answeredPlayerIds.length}/{room.players.filter((player) => player.connected).length} cevapladı</span></div>
            <h2 className="trivia-question">{room.trivia.question.prompt}</h2>
            <div className="trivia-options">{room.trivia.question.options.map((option, index) => {
              const alreadyAnswered = room.trivia.answeredPlayerIds.includes(playerId)
              return <button key={option} disabled={alreadyAnswered || status !== 'connected'} onClick={() => onSubmitAnswer(index)}>{String.fromCharCode(65 + index)}. {option}</button>
            })}</div>
            {room.trivia.answeredPlayerIds.includes(playerId) && <p className="trivia-waiting">Cevabın alındı. Diğer oyuncular bekleniyor…</p>}
          </>}
          {room.trivia.status === 'finished' && <div className="trivia-results"><span>🏆</span><h2>Yarışma bitti!</h2><p>İşte final puanları</p></div>}
          {(room.trivia.status === 'playing' || room.trivia.status === 'finished') && <div className="trivia-scores"><h3>{room.trivia.status === 'finished' ? 'Sonuç tablosu' : 'Puan durumu'}</h3>{[...room.trivia.scores].sort((a, b) => b.score - a.score).map((score, index) => <div key={score.playerId}><span>{index + 1}. {score.nickname}</span><b>{score.score} puan</b></div>)}</div>}
        </section>}
        {status === 'reconnecting' && <p className="reconnecting-note">Bağlantı geçici olarak kesildi. Oda üyeliğin kısa süre korunur.</p>}
        {status === 'error' && error && <div className="error-message room-error" role="alert">{error}</div>}
        <div className="room-footer-actions">
          {(status === 'error' || status === 'reconnecting') && <button className="secondary-button" onClick={onRetry}>Yeniden bağlan</button>}
          <button className="leave-button" onClick={onLeave}>Odadan ayrıl</button>
        </div>
      </> : <>
        <div className="room-actions">
          <button className="primary-button create-room-button" disabled={status === 'connecting' || status === 'reconnecting'} onClick={onCreate}>
            {status === 'connecting' ? 'Bağlanıyor…' : '＋  Yeni oda oluştur'}
          </button>
          <div className="or-divider"><span /> veya <span /></div>
          <label className="room-label" htmlFor="room-code">Oda kodun var mı?</label>
          <div className="room-form">
            <input id="room-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} onKeyDown={(event) => event.key === 'Enter' && onJoin(code)} placeholder="6 KARAKTERLİ KOD" maxLength={6} autoComplete="off" />
            <button disabled={status === 'connecting' || status === 'reconnecting'} onClick={() => onJoin(code)}>Katıl <span>→</span></button>
          </div>
        </div>
        {status === 'connecting' && <p className="connection-pending">Oda bağlantısı kuruluyor…</p>}
        {error && <div className="error-message room-error" role="alert">{error}</div>}
        {status === 'error' && <button className="secondary-button retry-button" onClick={onRetry}>Tekrar dene</button>}
      </>}

      {!room && status === 'idle' && <p className="room-small-note">Oda durumu yalnızca oda açıkken geçici olarak tutulur.</p>}
    </div>
  </main>
}
