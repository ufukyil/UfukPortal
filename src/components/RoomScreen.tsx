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
}

const statusLabels: Record<RoomStatus, string> = {
  idle: 'Hazır',
  connecting: 'Bağlanıyor',
  connected: 'Bağlı',
  reconnecting: 'Yeniden bağlanıyor',
  error: 'Bağlantı sorunu',
}

export function RoomScreen({ game, room, playerId, status, error, onCreate, onJoin, onLeave, onRetry, onBack }: RoomScreenProps) {
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
