# Teknik Yön

## Hedef deneyim
Kara Mühür, tek oyunculu ve çevrimdışı bir PC oyunu olarak tasarlanır. Teknik öncelikler gösterişli özelliklerden önce kararlı kare hızı, hızlı tepki veren kontroller ve uzun oturumlarda güvenilir çalışmadır.

## Hedef platform
- **Birincil platform:** Windows PC
- **Oynanış görünümü:** İzometrik kamera
- **Bağlantı:** Temel deneyim için internet bağlantısı gerektirmeyen yapı
- **Dil:** Türkçe
- **Performans:** Orta seviye donanımı gözeten ölçeklenebilir kalite seçenekleri

## Motor ve teknoloji kararı
Oyun motorunun nihai seçimi ve üretim mimarisi, teknik doğrulama aşamasında kesinleştirilmelidir. Bu dokümantasyon doğrulanmamış bir motoru tamamlanmış karar gibi sunmaz.

Motor değerlendirme ölçütleri:
1. İzometrik kamera ve yakın dövüş için kontrol hassasiyeti
2. Windows üzerinde kararlı performans
3. Sahne ve içerik üretim hızının sürdürülebilir olması
4. Kayıt sistemi ve çevrimdışı çalışma
5. Profil çıkarma, hata ayıklama ve paketleme araçları
6. Lisans ve uzun vadeli bakım maliyeti

## Performans ilkeleri
- Önce profil çıkar, sonra optimize et.
- Gereksiz bellek tahsisi ve pahalı her-kare işlemlerinden kaçın.
- Görüş dışındaki nesneler için uygun görünürlük yöntemleri kullan.
- Efekt ve gölge kalitesini donanıma göre ölçeklendir.
- Yükleme ve kayıt işlemlerini oynanışı mümkün olduğunca az kesintiye uğratacak biçimde tasarla.
- En düşük hedef donanımı testlerle belirle.

## Mimari alanlar
Oyuncu kontrolü ve savaş; düşman davranışları; görev ve dünya durumu; eşya ve envanter; diyalog ve anlatı tetikleyicileri; kayıt/yükleme; ses, kamera ve kullanıcı arayüzü; içerik verileri ve yerelleştirme.

## Kalite kapıları
Bir sistem yalnızca çalıştığı için hazır sayılmaz. Kontrol, hata durumları, performans, kayıt/yükleme davranışı ve oyuncuya verdiği geri bildirim birlikte değerlendirilmelidir.
