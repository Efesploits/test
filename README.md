# BERKAY CABBAR — Evrimin Son Halkası

Bir gorilin insana evrilişini anlatan, tamamen animasyonlu tek sayfalık tanıtım sitesi.
Berkay Cabbar'ın efsanevi hikâyesi: ormandan şehre, ham güçten zarafete.

## Öne çıkanlar

- **Preloader**: goril silueti çizilir, sonra insan siluetine dönüşür, perde açılır.
- **Hero**: etkileşimli parçacık takımyıldızı (imleçten kaçar, tıklamada şok dalgası), harf harf giriş
  animasyonu, RGB-glitch başlık, daktilo efekti, manyetik butonlar.
- **Evrim sahnesi**: sayfa kaydırmasına bağlı (scroll-scrub) SVG morph — 5 poz arasında nokta nokta
  interpolasyon ile goril → insan dönüşümü; arka plan orman → savana → neon şehir olarak geçiş yapar.
- **Kronoloji**: kendini çizen zaman çizelgesi, 3B eğimli kartlar, parallax.
- **Güçler**: imleci takip eden 3B tilt kartlar, canvas ile çizilmiş dönen sarmal/telkafes.
- **İstatistikler**: sayaç animasyonları, taşan yetenek barları, sürüklenebilir "Goril vs İnsan"
  karşılaştırması, animasyonlu radar grafiği.
- **Sözler**: sonsuz marquee şeritleri ve dokunmatik destekli alıntı karuseli.
- **Manifesto**: terminal yazım efekti, kinetik tipografi finali, konfeti patlaması.
- **Easter egg**: Konami kodu (↑↑↓↓←→←→BA) ile **GORİL MODU**.

Erişilebilirlik: `prefers-reduced-motion` tamamen destekleniyor, klavye ile gezilebilir,
360px genişliğe kadar duyarlı tasarım.

## Çalıştırma

Bağımlılık yok, derleme adımı yok. `index.html` dosyasını doğrudan tarayıcıda açabilirsiniz:

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## Yapı

```
index.html            # scripts/build.mjs tarafından üretilir
partials/*.html       # bölüm işaretlemeleri
assets/css/*.css      # tokens.css tasarım değişkenlerini içerir
assets/js/*.js        # core.js önce yüklenir, window.BC yardımcılarını sağlar
scripts/build.mjs     # partial'ları index.html içine gömer
CONTRACT.md           # bölümler arası kod sözleşmesi
```

Bir bölümü değiştirdikten sonra:

```bash
node scripts/build.mjs
```
