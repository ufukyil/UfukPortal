# Teknik Yön ve Prototip Planı

## Mevcut durum
Bu depo tasarım ve konsept dokümantasyonudur; oynanabilir prototipin tamamlandığı iddiasında bulunmaz. Oyun motoru ve nihai teknoloji seçimi, küçük bir teknik deneme sonrasında kararlaştırılmalıdır.

## Teknik karar ilkeleri
- İzometrik kamera ve 3B çevre/karakter yaklaşımı küçük bir test sahnesinde değerlendirilir.
- Öncelik: hareket, hedefleme, saldırı uyarıları, çarpışma, düşman yapay zekâsı ve okunabilir HUD.
- İlk testte bütün sınıflar yerine bir savaşçı döngüsü ile bir çevresel etkileşim doğrulanır.
- Yetenek tanımları, hasar türleri ve düşman davranışları sonradan genişletilebilecek biçimde tasarlanır.
- Tek oyunculu ve çevrimdışı yapı temel hedeftir; çevrimiçi servis zorunluluğu yoktur.

## Dikey dilim kapsamı

### Aşama 1 — Hareket ve savaş
Tek test alanı, oyuncu hareketi, kamera, kaçınma, hafif/ağır saldırı, bir normal düşman ve okunabilir özel saldırı, Can ve Dayanıklılık HUD'ı.

### Aşama 2 — Sınıf hissi
Savaşçı için karşı duruş ve ağır darbe; Taş Büyücüsü için Taş Mızrak veya Taş Siper. İki yeteneğin farklı taktik karar ürettiği test edilir.

### Aşama 3 — Keşif ve anlatı
Kül Ovası'nın küçük parçası, bir etkileşimli nesne, kısa görev, gizli alan, araştırmacı notu ve İlk İz'e ait ilk görsel/işitsel iz.

### Aşama 4 — İçerik genişletme
Diğer üç sınıfın temel döngüleri, ilk boss, yetenek/talant arayüzü, ekipman, görev kaydı ve kayıt sistemi.

## Test ölçütleri
- Oyuncu ilk 10 dakikada hareket, kaçınma ve saldırıyı öğrenebiliyor mu?
- Düşman saldırısının ne zaman geleceği anlaşılabiliyor mu?
- Sınıf yeteneği temel saldırıdan farklı karar gerektiriyor mu?
- Oyuncu hasar aldığında sebebini anlayabiliyor mu?
- Ekipman değişikliği davranışı değiştiriyor mu, yoksa yalnızca daha büyük sayı mı?
- 20 dakikalık testte sayı ve efekt yoğunluğu okunabilir kalıyor mu?

## Riskler
- **Kapsam şişmesi:** önce küçük dikey dilim; bütün sınıflar aynı anda kodlanmaz.
- **Güç şişmesi:** hasar, can ve zırh üst sınırları testlerle izlenir.
- **Görsel karmaşa:** efektler siluetleri kapatmamalı.
- **Hikâye açıklama yükü:** bilgi, diyalog duvarları yerine çevre ve çelişkili izlerle verilir.
- **Teknolojiye erken kilitlenme:** motor seçimi küçük deneme ve ekip ihtiyaçlarıyla doğrulanır.
