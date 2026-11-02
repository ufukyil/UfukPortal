# UfukPortal — Online Oyun Salonu

Arkadaşların birlikte oynayabilmesi için geliştirilen, Türkçe arayüzlü UfukPortal'ın ilk aşaması. Bu sürüm ana sayfayı, geçici takma ad girişini, üç oyun kartını ve oda akışı taslağını içerir. Oda oluşturma ve gerçek zamanlı oyun henüz etkin değildir.

## Gereksinimler

- Node.js 20 veya üzeri
- npm

## Yerel kurulum

```bash
npm install
npm run dev
```

Vite'ın gösterdiği yerel adresi tarayıcıda açın. Üretim derlemesi için `npm run build`, derlemeyi yerel olarak sunmak için `npm run preview` komutlarını kullanın.

Takma ad yalnızca tarayıcı belleğinde tutulur; sunucuya veya kalıcı bir kullanıcı veritabanına gönderilmez. Sayfa yenilenince silinir.

## Mimari

- React, TypeScript ve Vite ile tek sayfa uygulaması.
- Oyun tanımları `src/App.tsx` içindeki veri listesinden oluşturulur; ayrı oyun mantıkları sonraki aşamalarda bileşenlere ayrılabilir.
- Henüz API, kullanıcı hesabı, kalıcı veri deposu veya gerçek zamanlı bağlantı yoktur. Oda ekranındaki oluşturma düğmesi devre dışıdır; oda kodu alanı yalnızca taslak doğrulama gösterir.
- Gerçek zamanlı aşamada Cloudflare Worker HTTP/WebSocket uç noktalarını, Durable Objects ise oda başına geçici durumu yönetebilir. Takma ad gibi oda verileri bellek içinde tutulabilir; kalıcı kullanıcı veritabanı gerekmez.

## Cloudflare Workers'a ücretsiz yayın hazırlığı

Önerilen basit yayın akışı: bu depoyu GitHub'a gönderin, Cloudflare hesabında Workers & Pages → Create application → Pages → Connect to Git yoluyla GitHub deposunu bağlayın. Build komutu `npm run build`, çıktı dizini `dist` olmalıdır. Git'e gönderilen değişiklikler otomatik derlenip yayımlanabilir; bilgisayarınızın açık kalması gerekmez.

Bu depo henüz Cloudflare hesabına bağlanmamış ve internete yayımlanmamıştır. Cloudflare'ın 2026-11-02 tarihli dokümantasyonuna göre Workers Free planı günlük 100.000 Worker isteği ve istek başına 10 ms CPU sunuyor; ücretsiz kotanın aşılması istekleri hata ile durdurabilir. Durable Objects de ücretsiz planda kullanılabilir; SQLite destekli nesneler için günlük 100.000 istek ve 13.000 GB-s çalışma süresi kotası bulunuyor. WebSocket kullanan oda tasarımında nesne hibernation API'si boşta bağlantı maliyetini sınırlamak için önemlidir. Kotalar zamanla değişebilir; uygulama büyürse dağıtım öncesi resmi limit sayfalarını yeniden kontrol edin. İstemciye gizli API anahtarı eklemeyin; sunucu sırlarını gerekiyorsa Cloudflare ortam değişkenlerinde tutun.

Resmi kaynaklar: [Workers limitleri](https://developers.cloudflare.com/workers/platform/limits/), [Durable Objects fiyatlandırması ve ücretsiz kotalar](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Pages Git entegrasyonu](https://developers.cloudflare.com/pages/get-started/git-integration/).

## Sonraki geliştirme aşaması

1. Worker endpoint'leri ve Durable Object oda sınıfını ekle.
2. Oda oluşturma, kodla katılma, WebSocket bağlantısı ve katılımcı listesini uygula.
3. Bağlantı hatası, oda doluluğu ve oda ömrü durumlarını kullanıcıya göster.
4. Üç oyunun tur/puan akışlarını oda durumuna bağla.
