# SIMD-SISD Simulator

BM208 Bilgisayar Mimarisi (İ.Ö) dönem projesi. Bu proje, klasik SISD CPU ile SIMD vektör işlemcilerini görsel olarak karşılaştıran, cycle-accurate (saat vuruşu hassasiyetli) bir donanım simülatörüdür.

## Kurulum ve Çalıştırma

Projeyi çalıştırmak için bilgisayarınızda Node.js (v20 veya üzeri) kurulu olmalıdır.

1. Proje klasörünü VS Code ile açın.
2. Terminali açarak projenin gereksinimlerini yükleyin:
   npm install

3. Kurulum bittikten sonra geliştirme sunucusunu başlatın:
   npm run dev

4. Tarayıcınızda http://localhost:8080 adresine giderek simülatörü kullanmaya başlayabilirsiniz.

## Teslim ve Derleme (Build)

Projeyi statik dosyalar halinde derlemek isterseniz:
npm run build

Bu komut, tüm projeyi optimize edip dist/ klasörüne çıkaracaktır.

## Proje Dosya Yapısı ve Görevleri

Projenin temel donanım mantığı ve arayüzü aşağıdaki dosyalara bölünmüştür:

- src/lib/simEngine.ts: Simülasyonun matematiksel motoru. İşlemcilerin (SISD/SIMD) cycle gecikmeleri, veri çekme ve hesaplama algoritmaları burada yer alır.
- src/routes/index.tsx: Simülatörün ana arayüz bileşenlerinin (register'lar, ALU'lar, grafikler) birleştirildiği dosya.
- src/components/sim/: Klasik işlemci ve vektör işlemcisine ait spesifik görsel bileşenler (ProcessorCard, RegisterGrid, vb.).
- src/lib/i18n.ts: Arayüzdeki metin içerikleri.

## Kullanılan Teknolojiler

- React 19 & TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion (Veri akışı ve cycle animasyonları için)

---
Düzce Üniversitesi - Bilgisayar Mühendisliği