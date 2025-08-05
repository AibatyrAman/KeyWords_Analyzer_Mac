# ASO Keywords Analyzer - React Edition

Bu proje, Python Flet tabanlı ASO Keywords Analyzer'ın React versiyonudur. CSV dosyalarını işleyerek ASO (App Store Optimization) analizi yapmanızı sağlar.

## 🚀 Özellikler

### 📁 Dosya İşleme
- **Tek Klasör Modu**: Tek klasördeki tüm CSV dosyalarını birleştirir
- **Tarih Modu**: Çoklu klasör yapısı ile tarih bilgisi ekler
- **Dosya Modu**: Tek CSV dosyası işleme
- Drag & Drop dosya yükleme desteği

### 🔍 Filtreleme Sistemi
- **Sütun Filtreleri**: Volume, Difficulty, Growth için dinamik slider'lar
- **Keyword Arama**: Dahil etme ve çıkarma terimleri
- **Latin Alfabesi Filtresi**: Latin harici alfabeleri filtreleme
- **Gerçek Zamanlı Filtreleme**: Anında sonuç güncelleme

### 📊 Veri Görüntüleme
- **Sıralanabilir Tablo**: Tüm sütunlar için sıralama
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **Veri Özeti**: Ortalama değerler ve istatistikler

### 📥 Export Özellikleri
- **Excel Export**: XLSX formatında dışa aktarma
- **CSV Export**: Alternatif format desteği
- **Özelleştirilebilir Dosya Adı**: Timestamp ile birlikte

## 🛠️ Teknoloji Stack'i

- **Frontend**: React 18 + TypeScript
- **UI Framework**: Material-UI (MUI)
- **State Management**: Zustand
- **File Processing**: Papa Parse (CSV)
- **Excel Export**: SheetJS (xlsx)
- **File Upload**: React Dropzone

## 📦 Kurulum

### Gereksinimler
- Node.js 16+ 
- npm veya yarn

### Adımlar

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Geliştirme sunucusunu başlatın:**
```bash
npm start
```

3. **Production build oluşturun:**
```bash
npm run build
```

## 🎯 Kullanım

### 1. Dosya Yükleme
- **Normal Mod**: CSV dosyalarını sürükleyip bırakın
- **Tarih Modu**: Klasör yapısı ile dosyaları yükleyin
- **Dosya Modu**: Tek CSV dosyası seçin

### 2. Veri İşleme
- "Verileri Yükle" butonuna tıklayın
- İşlem tamamlandığında tablo otomatik güncellenir

### 3. Filtreleme
- **Sütun Filtreleri**: Slider'ları kullanarak aralık belirleyin
- **Keyword Arama**: Terimleri ekleyin/çıkarın
- **Latin Filtresi**: Checkbox ile aktifleştirin

### 4. Export
- Dosya adını belirleyin
- Kaydetme yerini seçin
- "Excel İndir" butonuna tıklayın

## 📁 Proje Yapısı

```
src/
├── components/          # React bileşenleri
│   ├── FileUpload.tsx  # Dosya yükleme
│   ├── FilterPanel.tsx # Filtreleme paneli
│   ├── DataTable.tsx   # Veri tablosu
│   ├── MessageDisplay.tsx # Mesaj gösterme
│   └── LoadingOverlay.tsx # Yükleme overlay
├── store/              # Zustand store
│   └── index.ts        # Ana store
├── utils/              # Yardımcı fonksiyonlar
│   ├── csvProcessor.ts # CSV işleme
│   └── exportUtils.ts  # Export fonksiyonları
├── types/              # TypeScript tipleri
│   └── index.ts        # Tip tanımları
├── App.tsx             # Ana uygulama
└── index.tsx           # Giriş noktası
```

## 🔧 Geliştirme

### Yeni Özellik Ekleme
1. İlgili bileşeni `src/components/` altında oluşturun
2. Store'a gerekli state'leri ekleyin
3. Tip tanımlarını `src/types/` altında güncelleyin

### Stil Değişiklikleri
- Material-UI tema sistemi kullanılıyor
- `App.tsx` içindeki `createTheme` fonksiyonunu düzenleyin

## 🐛 Sorun Giderme

### Yaygın Sorunlar

1. **Dosya yükleme hatası**
   - Dosya formatının CSV olduğundan emin olun
   - Dosya boyutunu kontrol edin

2. **Filtreleme çalışmıyor**
   - Verilerin yüklendiğinden emin olun
   - Filtre değerlerini kontrol edin

3. **Export hatası**
   - Tarayıcı izinlerini kontrol edin
   - Dosya adının geçerli olduğundan emin olun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 İletişim

Sorularınız için issue açabilir veya iletişime geçebilirsiniz. 