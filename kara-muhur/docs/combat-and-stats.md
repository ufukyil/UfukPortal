# Savaş, İstatistikler ve Denge

## Tasarım hedefi
Kara Mühür'de karakter gelişimi büyük rakamlar üretmek yerine karar kalitesini artırır. Oyuncu milyonlarca hasar görmek için değil; zamanlama, menzil, direnç, düşman açığı ve yetenek kombinasyonlarıyla ustalaşmak için güçlenir.

## Ana istatistikler

| İstatistik | Başlangıç aralığı (örnek) | Etkisi |
|---|---:|---|
| Can | 80–110 | Düşmeden önce dayanılabilecek hasar |
| Dayanıklılık | 60–100 | Kaçınma, ağır hamle ve savunma eylemleri |
| Odak | 40–80 | Büyü, ruh ve özel yetenek kaynağı |
| Güç | 4–10 | Ağır fiziksel vuruş ve denge hasarı |
| Çeviklik | 4–10 | Hareket, hafif silah ve kaçınma verimliliği |
| Bilgelik | 4–10 | Odak yönetimi ve doğaüstü yetenekler |
| Denge | 0–100 | Ağır darbelerle azalır; sıfırlanınca açıklık oluşur |
| Zırh | 0–20 | Fiziksel hasarı azaltır |
| Direnç | 0–30% | Eşleşen hasar türüne karşı koruma |

Bu değerler prototip dengeleme örnekleridir, kesin nihai tablo değildir. Oyuncunun tek bakışta anlayamayacağı katsayı yığınları kullanılmaz.

## Hasar modeli
İlk prototip için basit bir yaklaşım:
- Ham hasar: silah gücü + yetenek katkısı.
- Zırh azaltımı, üst sınırları olan tek bir anlaşılır formülle uygulanır.
- Direnç yalnızca eşleşen doğaüstü hasar türüne uygulanır.
- Kritik ve açıklık bonusları çarpılarak kontrolden çıkmaz; küçük ve sınırlı katkılar olur.

Formül prototipte test edilir; hedef, oyuncuya neden hasar aldığını ve verdiğini açıklayabilmektir.

## Saldırı dili
Her düşman saldırısı üç okunabilir evreye ayrılır:
1. **Niyet:** duruş, ses veya kısa görsel işaret.
2. **Tehlike:** saldırı alanı ve zamanlama belirginleşir.
3. **Sonuç ve toparlanma:** saldırı gerçekleşir; düşmanın karşılık verilebilecek penceresi doğar.

Hızlı saldırı kısa hazırlık ve düşük denge hasarı taşır. Ağır saldırı daha çok hasar ve sendeletme sağlar ama yavaştır; kaçırılırsa cezalandırılır. Menzilli saldırının da atış çizgisi ve hazırlık işareti bulunur.

## Hasar türleri
- **Kesici:** hafif ve orta zırha karşı dengeli.
- **Darbe:** denge kırmada güçlü; çevik hedeflere karşı yavaş kalabilir.
- **Taş:** alan ve konum kontrolü.
- **Ruh:** bazı maddi savunmaları aşabilir; ruh direnci olan hedeflerde etkisi azalır.
- **Yaban:** kök, diken, bağlama ve hareket kısıtlama.
- **Kül:** hikâyeye bağlı bozulma türü; sıradan bir hasar bonusuna dönüşmemeli.

## Silah dengesi: DMG / SPD / RANGE
Silahlar aynı silahın daha büyük sayılı sürümü değildir. Üç eksen vardır: **DMG** (hasar), **SPD** (hız), **RANGE** (menzil).

| Silah | Hasar | Hız | Menzil | Bedel |
|---|---|---|---|---|
| Kısa bıçak | Düşük | Çok yüksek | Çok kısa | Zırhlı hedefte zayıf |
| Tek elli kılıç | Orta | Orta | Orta | Dengeli ama uzmanlaşmamış |
| Ağır topuz | Yüksek denge hasarı | Düşük | Kısa-orta | Kaçırma cezası yüksek |
| Uzun mızrak | Orta | Orta | Uzun | Dar saldırı yayı |
| Taş odak | Düşük fiziksel | Değişken | Yeteneğe bağlı | Gücü yetenek etkileşiminden gelir |

Hız artıyorsa vuruş başına hasar veya menzil düşer; menzil artıyorsa toparlanma ya da saldırı yayı daralabilir.

## Denge ve sendeleme
Düşmanların ayrı bir denge ölçeri vardır. Ağır saldırılar, doğru karşılıklar ve çevresel çarpışmalar dengeyi azaltır. Denge sıfırlanınca düşman kısa süre savunmasız kalır. Bu pencere sonsuz kombo kilidine dönüşmez; bosslar kısmi direnç ve değişken toparlanma kullanır.

## Kaçınma ve savunma
- Kaçınma doğru zamanlandığında hasarı önler; sınırsız kaçış değildir.
- Blok hasarı azaltır ama dayanıklılık tüketir.
- Karşılama dar zaman penceresi ister ve başarıda fırsat verir.
- Her saldırı karşılanamaz; ağır alan saldırıları konum değiştirerek aşılır.

## Okunabilirlik
Renk tek başına uyarı değildir; şekil, ses ve animasyon eşlik eder. Efektler karakter siluetini ve tehlike alanını örtmez. Zorluk, düşmanın canını katlamak yerine davranış ve karşılaşma düzeniyle artırılır.
