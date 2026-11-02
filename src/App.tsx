import { useState } from 'react'

type Game = { id: string; title: string; description: string; tag: string; icon: string; color: string; players: string; time: string }

const games: Game[] = [
  { id: 'charades', title: 'Sessiz Sinema', description: 'Kelimeleri konuşmadan anlat, takımınla kahkahalara karış.', tag: 'TAKIM OYUNU', icon: '🎭', color: 'violet', players: '4–12 oyuncu', time: '15–30 dk' },
  { id: 'trivia', title: 'Genel Kültür', description: 'Bilgini konuştur, arkadaşlarından önce doğru cevabı bul.', tag: 'BİLGİ YARIŞMASI', icon: '💡', color: 'amber', players: '2–10 oyuncu', time: '10–20 dk' },
  { id: 'movie', title: 'Film Tahmin Etmece', description: 'İpuçlarını yakala ve filmi herkesten önce tahmin et.', tag: 'TAHMİN OYUNU', icon: '🎬', color: 'mint', players: '2–8 oyuncu', time: '10–20 dk' },
]

function App() {
  const [nickname, setNickname] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [screen, setScreen] = useState<'home' | 'room'>('home')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')

  const enter = () => {
    const name = nickname.trim().replace(/\s+/g, ' ')
    if (name.length < 2 || name.length > 20 || !/^[\p{L}\p{N} _-]+$/u.test(name)) {
      setError('Takma ad 2–20 karakter olmalı; harf, rakam, boşluk, _ veya - kullanabilirsin.')
      return
    }
    setPlayerName(name)
    setError('')
  }

  const openRoom = (gameId: string) => {
    if (!playerName) { document.getElementById('nickname')?.focus(); setError('Devam etmek için önce bir takma ad seç.'); return }
    setSelected(gameId)
    setRoomCode('')
    setScreen('room')
  }

  const joinRoom = () => {
    setError(roomCode.trim().length < 4 ? 'Oda kodu en az 4 karakter olmalı.' : 'Oda sistemi henüz hazır değil. Bu ekran sonraki aşamada etkinleştirilecek.')
  }

  const selectedGame = games.find((game) => game.id === selected)

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" onClick={() => setScreen('home')} aria-label="UfukPortal ana sayfa"><span className="brand-mark"><span>u</span></span><span>ufuk<span className="brand-light">portal</span></span></a>
      <nav className="nav-links"><a href="#games" onClick={() => setScreen('home')}>Oyunlar</a><a href="#how">Nasıl oynanır?</a></nav>
      <div className="top-actions"><span className="status"><i /> Arayüz ön izlemesi</span><span className="top-divider" />{playerName ? <span className="profile-chip"><span className="avatar">{playerName.slice(0, 1).toLocaleUpperCase('tr')}</span>{playerName}</span> : <a className="login-link" href="#nickname">Oyuncu girişi <span>↗</span></a>}</div>
    </header>

    {screen === 'home' ? <main id="top">
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-star">✳</span> ARKADAŞLARIN BURADA</div>
          <h1>İyi oyun,<br /><span>iyi arkadaşlarla.</span></h1>
          <p className="hero-description">Arkadaşlarını topla, bir oyun seç ve ekranın ötesinde buluş. Oyun gecesini başlatmak sadece birkaç saniye.</p>
          <div className="hero-ctas"><a className="primary-button" href="#games">Oyunlara göz at <span>→</span></a><a className="text-button" href="#how"><span className="play-small">▷</span> Nasıl oynanır?</a></div>
          <div className="social-proof"><div className="avatar-stack"><span>🧑🏻</span><span>👩🏽</span><span>🧔🏻</span><span>👩🏻</span></div><span>Arkadaşlarınla <b>aynı odada</b><br />oyun keyfi</span></div>
        </div>
        <div className="hero-art" aria-label="Birlikte oynayan arkadaşları temsil eden dekoratif illüstrasyon"><div className="art-glow"/><div className="art-ring ring-one"/><div className="art-ring ring-two"/><span className="spark spark-a">✦</span><span className="spark spark-b">✳</span><span className="spark spark-c">✦</span><div className="floating-note note-one">✦ &nbsp; Oyun gecesi!</div><div className="floating-note note-two">🗣️ &nbsp; 4 arkadaş oynuyor</div><div className="people-art"><div className="person person-purple"><span className="hair">〰</span><span className="face">◡</span><span className="body">✳</span></div><div className="person person-orange"><span className="hair">⌁</span><span className="face">⌣</span><span className="body">♥</span></div><div className="person person-blue"><span className="hair">⌁</span><span className="face">◡</span><span className="body">✿</span></div></div><div className="art-caption"><span className="caption-dot"/> BİRLİKTE DAHA EĞLENCELİ</div></div>
      </section>

      <section className="lobby-card" id="nickname"><div className="lobby-heading"><div className="lobby-icon">✳</div><div><h2>Oyuna katıl</h2><p>Bir takma ad seç, eğlenceye dahil ol.</p></div></div><div className="lobby-form"><div className="input-wrap"><span className="input-user">♙</span><input id="nickname" aria-label="Takma ad" value={nickname} onChange={(e) => { setNickname(e.target.value); setError('') }} onKeyDown={(e) => e.key === 'Enter' && enter()} placeholder="Takma adın ne olsun?" maxLength={24} />{playerName && <span className="input-check">✓</span>}</div><button className="join-button" onClick={enter}>{playerName ? 'Adını güncelle' : 'Devam et'} <span>→</span></button></div>{error && screen === 'home' && <div className="error-message" role="alert">{error}</div>}<div className="privacy-note"><span>♧</span> Hesap yok, e-posta yok. Sadece sen ve arkadaşların.</div></section>

      <section className="games-section" id="games"><div className="section-heading"><div><div className="eyebrow section-eyebrow">SENİ NE BEKLİYOR?</div><h2>Oyununu seç<span>.</span></h2></div><span className="game-count">03 OYUN</span></div><div className="game-grid">{games.map((game, index) => <button className={`game-card ${game.color}`} key={game.id} onClick={() => openRoom(game.id)}><div className="card-top"><span className="game-tag">{game.tag}</span><span className="card-arrow">↗</span></div><div className={`game-illustration ${game.color}`}><span className="illustration-glow"/><span className="game-emoji">{game.icon}</span><span className="float-symbol">{index === 0 ? '✦' : index === 1 ? '?' : '✧'}</span></div><div className="card-bottom"><h3>{game.title}</h3><p>{game.description}</p><div className="card-meta"><span>♙ &nbsp;{game.players}</span><span>◷ &nbsp;{game.time}</span></div></div></button>)}</div></section>
      <section className="how-section" id="how"><div><div className="eyebrow section-eyebrow">BAŞLAMAK ÇOK KOLAY</div><h2>Üç adımda oyun gecesi.</h2></div><div className="steps"><div><span>01</span><b>Takma adını seç</b><small>Hesap oluşturmadan katıl.</small></div><div><span>02</span><b>Bir oyun seç</b><small>Ekibini ve oyununu belirle.</small></div><div><span>03</span><b>Arkadaşlarını çağır</b><small>Aynı odada buluşup oyna.</small></div></div></section>
    </main> : <main className="room-page"><button className="back-link" onClick={() => { setScreen('home'); setError('') }}>← Oyunlara dön</button><div className="room-panel"><div className="room-game-icon">{selectedGame?.icon}</div><div className="eyebrow section-eyebrow">{selectedGame?.tag}</div><h1>{selectedGame?.title}</h1><p className="room-lead">Arkadaşlarınla bir oyun odasında buluş.</p><div className="draft-notice"><span>◷</span><div><b>Oda sistemi hazırlık aşamasında</b><p>Oda oluşturma ve kodla katılma sonraki geliştirme aşamasında etkinleştirilecek. Henüz gerçek zamanlı bağlantı kurulmaz.</p></div></div><div className="room-actions"><button className="primary-button disabled-button" disabled>＋ &nbsp; Yeni oda oluştur</button><div className="or-divider"><span/> veya <span/></div><label className="room-label" htmlFor="room-code">Oda kodun var mı?</label><div className="room-form"><input id="room-code" value={roomCode} onChange={(e) => { setRoomCode(e.target.value.toUpperCase().slice(0, 8)); setError('') }} placeholder="ÖR. A7K2Q" maxLength={8} /><button onClick={joinRoom}>Katıl <span>→</span></button></div>{error && <div className="error-message" role="alert">{error}</div>}</div></div></main>}

    <footer className="footer"><a className="brand footer-brand" href="#top" onClick={() => setScreen('home')}><span className="brand-mark"><span>u</span></span><span>ufuk<span className="brand-light">portal</span></span></a><span>Arkadaşlarla güzel vakit geçirmek için. <span className="footer-heart">♥</span></span><span>© 2026 UfukPortal</span></footer>
  </div>
}

export default App
