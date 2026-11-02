# UfukPortal — Online Oyun Salonu

React + TypeScript + Vite arayüzü ve ayrı bir Cloudflare Worker üzerinde çalışan gerçek zamanlı oda altyapısı. Sessiz Sinema, Genel Kültür ve Film Tahmin Etmece için oda oluşturma ve oda koduyla katılma desteklenir. Genel Kültür oyununda oda sahibi oyunu başlatabilir; 10 soru, eş zamanlı cevap toplama, doğru cevap başına 10 puan ve sonuç tablosu vardır. Diğer iki oyunun tur ve puanlama akışları henüz eklenmemiştir.

## Gereksinimler

- Node.js 20 veya üzeri
- npm

## Yerel geliştirme

Bağımlılıkları kurun:

```bash
npm install
```

Worker yerel gizli ayarlarını proje kökünde `.dev.vars` dosyasına ekleyin. Dosya Git tarafından yok sayılır. PowerShell örneği:

```powershell
$roomSecret = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
@"
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ROOM_TOKEN_SECRET=$roomSecret
"@ | Set-Content .dev.vars
```

İki terminal açın:

```bash
npm run dev:worker
```

```bash
npm run dev
```

Vite `5173` portundaki `/api` isteklerini yerel Worker'ın `8787` portuna iletir. Tarayıcıda Vite'ın yazdığı adresi açın. Worker sağlık kontrolü `http://127.0.0.1:8787/api/health` adresindedir.

Testleri ve üretim derlemesini çalıştırın:

```bash
npm test
npm run build
```

Wrangler türlerini yapılandırmadan yeniden üretmek için `npm run cf:types` kullanın.

## Oda altyapısı

- `worker/index.ts`: Worker HTTP, origin ve WebSocket yükseltme kontrolleri ile oda başına Durable Object yönlendirmesi.
- `worker/room-model.ts`: takma ad, oda kodu, mesaj şeması, 8 oyuncu sınırı ve bağlantı süresi kuralları.
- `RoomDurableObject`: oda ve oyuncu durumunu bellekte tutar. Oda durumu veritabanına yazılmaz. Hibernation sırasında açık WebSocket bağlantılarının ekleri oda görünümünü geri kurar.
- Oda kodları sunucuda kriptografik rastgelelikle 6 karakter üretilir. İstemciden sahiplik veya oyuncu listesi kabul edilmez.
- Mesajlar JSON şeması, izin verilen işlem türleri ve 2 KiB boyut sınırıyla doğrulanır. WebSocket Origin değeri `ALLOWED_ORIGINS` listesinde tam eşleşmelidir.
- Yeniden bağlanma bileti sunucu tarafından HMAC ile imzalanır ve yalnızca sekmenin `sessionStorage` alanında tutulur. Bağlantı 30 saniye içinde yeniden kurulabilir. Son oyuncu bağlantısı kesilince oda bellekte bu süre kadar tutulur; süre dolunca temizlenir. Açık bağlantısı olan odalarda bağlantı ekleri, oda durumu dışında kalıcı bir kullanıcı verisi oluşturmaz.
- Kullanıcı hesabı ve kalıcı kullanıcı veritabanı yoktur. Genel Kültür oyun durumu oda belleğinde tutulur; oda kapanırsa oyun ilerlemesi kalıcı değildir.

## Yapılandırma ve yayın

Mevcut Cloudflare Pages arayüzü ayrı kalır. Gerçek zamanlı API, `wrangler.jsonc` ile tanımlı bağımsız `ufukportal-room-api` Worker'ıdır. Yeni Durable Object sınıfı SQLite destekli `exports` yaşam döngüsü yapılandırmasını kullanır; Worker oda verisini SQLite'a yazmaz.

Cloudflare hesabında API'yi yayımlamadan önce:

1. Worker'ın `ALLOWED_ORIGINS` değişkenine Pages sitesinin tam `https://...` origin'ini (gerekirse önizleme origin'lerini virgülle ayırarak) ekleyin. Joker origin kullanılmaz.
2. Worker için `ROOM_TOKEN_SECRET` adında en az 32 karakterli bir secret oluşturun (`npx wrangler secret put ROOM_TOKEN_SECRET`). Bu değer frontend'e, `.env` dosyasına veya GitHub'a konmamalıdır.
3. `npx wrangler login` sonrası `npm run deploy:worker` ile yalnızca Worker'ı yayımlayın. Wrangler çıktısında Worker adresini not edin.
4. Cloudflare Pages proje ayarlarında `VITE_API_BASE_URL` build değişkenini Worker'ın `https://...workers.dev` adresine ayarlayın ve Pages build'ini çalıştırın. Vite bu adresi `wss://` bağlantısına dönüştürür.

Bu depo şu anda hiçbir Cloudflare hesabına veya production API adresine bağlı değildir; burada deploy yapılmamıştır. Worker secret'ı, izin verilen production origin ve Pages `VITE_API_BASE_URL` ayarlanmadıkça canlı arayüz oda sunucusuna bağlanamaz.

### Güncel ücretsiz plan notu

Cloudflare belgeleri 2026-11-03 tarihinde kontrol edildi. Workers Free için günlük 100.000 istek ve istek başına 10 ms CPU; Durable Objects Free için SQLite destekli sınıflarda günlük 100.000 istek ve 13.000 GB-s çalışma süresi belirtiliyor. Ücretsiz limit aşımında ilgili işlemler hata verebilir. Hibernation boşta WebSocket odalarının süre maliyetini azaltır; bağlantı koptuktan sonraki 30 saniyelik bellekte tutma aralığı ise nesneyi çalışır durumda tutabilir ve süre kotasından tüketebilir. Trafiğe göre Cloudflare panelindeki gerçek kullanım izlenmelidir; limit ve fiyatlar değişebilir.

Kaynaklar: [Workers limitleri](https://developers.cloudflare.com/workers/platform/limits/), [Durable Objects fiyatlandırması](https://developers.cloudflare.com/workers/platform/pricing/), [Durable Objects WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [Wrangler yapılandırması](https://developers.cloudflare.com/workers/wrangler/configuration/).

## Aşama kapsamı dışı

Sessiz Sinema ve Film Tahmin Etmece oyun turu/puanlama, kullanıcı hesabı ve kalıcı oyuncu verisi henüz eklenmedi. Production dağıtımı bu geliştirme dalında yapılmadı; birleştirme öncesinde test ve derleme doğrulanmalıdır.
