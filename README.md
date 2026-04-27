# VECTOR.SIM — SIMD vs SISD Mimari Simülatörü

BM208 İ.Ö dönem projesi. Klasik SISD CPU ile SIMD vektör işlemcilerini görsel olarak karşılaştıran cycle-accurate bir simülatör.

---

## 🚀 Bilgisayarına Kurulum (VS Code)

### Gereksinimler

Sadece tek bir şey kur — gerisi otomatik:

- **Node.js 20+** → https://nodejs.org/ (LTS sürümünü indir)

Kurulduğunu kontrol et:
```bash
node --version
npm --version
```

### Adım Adım

**1. Projeyi indir**

Bu projedeki tüm dosyaları bir klasöre kopyala (örn: `Masaüstü/vector-sim`).

**2. VS Code'da aç**

```bash
cd vector-sim
code .
```

Veya VS Code'u aç → `File → Open Folder` → klasörü seç.

**3. Bağımlılıkları yükle**

VS Code'da terminal aç (`Ctrl + ö` veya `View → Terminal`) ve şunu yaz:

```bash
npm install
```

Bu işlem 1-2 dakika sürebilir, internet hızına bağlı.

**4. Geliştirme sunucusunu başlat**

```bash
npm run dev
```

Terminalde şuna benzer bir çıktı görmelisin:
```
  ➜  Local:   http://localhost:8080/
```

Tarayıcıda `http://localhost:8080` adresini aç. ✅ Tamamdır.

---

## 📦 Build Almak (Sunum / Teslim için)

Hocaya sadece HTML+JS dosyası teslim etmek istersen:

```bash
npm run build
```

Çıktı `dist/` klasörüne yazılır. Bu klasördeki dosyaları herhangi bir web sunucusuna (veya `npx serve dist`) atarak çalıştırabilirsin.

```bash
npx serve dist
```

---

## 📁 Proje Yapısı

```
vector-sim/
├── src/
│   ├── components/
│   │   ├── sim/              ← Simülatör bileşenleri
│   │   │   ├── ProcessorCard.tsx
│   │   │   ├── RegisterGrid.tsx
│   │   │   ├── AluLanes.tsx
│   │   │   ├── CycleBadge.tsx
│   │   │   ├── Metrics.tsx
│   │   │   ├── Panel.tsx
│   │   │   └── TraceTable.tsx
│   │   └── ui/               ← shadcn/ui bileşen kütüphanesi
│   ├── lib/
│   │   ├── simEngine.ts      ← Simülasyon motoru (asıl mantık)
│   │   ├── i18n.ts           ← Türkçe/İngilizce metinler
│   │   └── utils.ts
│   ├── routes/
│   │   ├── __root.tsx        ← Ana layout (HTML iskeleti)
│   │   └── index.tsx         ← Anasayfa (TÜM sayfa içeriği burada)
│   ├── hooks/
│   ├── styles.css            ← Tailwind + tema renkleri
│   └── router.tsx
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md (bu dosya)
```

### Önemli Dosyalar

| Dosya | Ne işe yarar |
|------|--------------|
| `src/routes/index.tsx` | Anasayfa — Hero, About, Simulator hepsi burada |
| `src/lib/simEngine.ts` | SISD/SIMD simülasyon mantığı |
| `src/lib/i18n.ts` | Tüm metinler (TR/EN) |
| `src/styles.css` | Renkler, fontlar, tema |

---

## 🎨 Tema / Renk Değiştirme

`src/styles.css` dosyasındaki `:root` ve `.dark` blokları içinde `oklch(...)` değerlerini değiştir.

---

## ❓ Sorun Giderme

**`npm install` hata veriyor:**
- Node.js sürümünü kontrol et (`node --version` → 20+ olmalı)
- `node_modules` klasörünü ve `package-lock.json` dosyasını sil, tekrar dene

**Port 8080 kullanımda:**
- Başka bir uygulama portu kullanıyor olabilir, kapat veya `vite.config.ts` içinde port değiştir

**"Cannot find module" hatası:**
- `npm install` komutunu tekrar çalıştır

---

## 📚 Teknoloji Stack

- **React 19** — UI framework
- **TypeScript** — Tip güvenliği
- **Vite** — Build tool
- **Tailwind CSS v4** — Stil
- **TanStack Router** — Routing
- **Framer Motion** — Animasyonlar
- **shadcn/ui** — UI bileşenleri

---

**BM208 İ.Ö · 2026**
