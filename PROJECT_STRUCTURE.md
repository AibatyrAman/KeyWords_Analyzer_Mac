# ASO Keywords Analyzer - React Proje Yapısı

## 📁 **Ana Dizin Yapısı**

```
KeyWords_Analyzer_Mac/
├── package.json              # Proje bağımlılıkları ve script'ler
├── tsconfig.json            # TypeScript konfigürasyonu
├── README.md               # Proje dokümantasyonu
├── PROJECT_STRUCTURE.md    # Bu dosya - Proje yapısı açıklaması
├── public/                 # Statik dosyalar
│   └── index.html         # HTML template
└── src/                   # Kaynak kodlar
    ├── index.tsx          # React giriş noktası
    ├── App.tsx            # Ana uygulama bileşeni
    ├── types/             # TypeScript tip tanımları
    ├── store/             # State yönetimi
    ├── utils/             # Yardımcı fonksiyonlar
    └── components/        # React bileşenleri
```

## 🏗️ **Detaylı Klasör Yapısı**

### **1. `public/` - Statik Dosyalar**
```
public/
└── index.html             # Ana HTML template
    ├── Meta tag'ler
    ├── Google Fonts linkleri
    ├── Material Icons
    └── Root div (#root)
```

**İçerik:**
- HTML5 template
- Meta tag'ler (viewport, theme-color, description)
- Google Fonts (Roboto)
- Material Icons
- Root div elementi

### **2. `src/types/` - Tip Tanımları**
```
src/types/
└── index.ts              # TypeScript interface'leri
    ├── KeywordData       # CSV veri yapısı
    ├── FilterState       # Filtre durumu
    ├── AppState          # Uygulama durumu
    ├── ColumnFilter      # Sütun filtresi
    ├── ExportOptions     # Export ayarları
    └── TitleSubtitleData # Başlık/alt başlık verisi
```

**Tip Tanımları:**
```typescript
interface KeywordData {
  Category?: string;
  Keyword: string;
  Volume: number;
  Difficulty: number;
  'Growth (Max Reach)'?: number;
  Date?: string;
}

interface FilterState {
  columnFilters: Record<string, { min: number; max: number }>;
  searchTerms: string[];
  excludeTerms: string[];
  filterNonLatin: boolean;
}

interface AppState {
  mergedData: KeywordData[] | null;
  currentTable: KeywordData[] | null;
  loading: boolean;
  error: string | null;
  success: string | null;
  dateMode: boolean;
  fileMode: boolean;
  selectedCountry: string;
  appName: string;
  filters: FilterState;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
}
```

### **3. `src/store/` - State Yönetimi**
```
src/store/
└── index.ts              # Zustand store
    ├── AppStore interface
    ├── State tanımları
    ├── Action fonksiyonları
    └── Filter yönetimi
```

**Store Özellikleri:**
- Zustand kullanarak state management
- Merkezi state yönetimi
- Action fonksiyonları
- Filter state yönetimi
- Loading ve error state'leri

### **4. `src/utils/` - Yardımcı Fonksiyonlar**
```
src/utils/
├── csvProcessor.ts        # CSV işleme sınıfı
│   ├── mergeNoDuplicateData()
│   ├── mergeWithDateData()
│   ├── processSingleCsvFile()
│   ├── filterKVD()
│   ├── getWordFrequency()
│   ├── filterBrandedWords()
│   └── removeSuffixes()
└── exportUtils.ts         # Export fonksiyonları
    ├── exportToExcel()
    ├── exportToCsv()
    ├── sanitizeFilename()
    └── generateTimestamp()
```

**CSV Processor Fonksiyonları:**
- `mergeNoDuplicateData()`: Tek klasördeki CSV'leri birleştirir
- `mergeWithDateData()`: Tarih modu için çoklu klasör işleme
- `processSingleCsvFile()`: Tek CSV dosyası işleme
- `filterKVD()`: Keyword, Volume, Difficulty filtresi
- `getWordFrequency()`: Kelime frekans analizi
- `filterBrandedWords()`: Branded kelimeleri filtreleme
- `removeSuffixes()`: Çoğul eklerini kaldırma

**Export Utils Fonksiyonları:**
- `exportToExcel()`: Excel dosyası oluşturma ve indirme
- `exportToCsv()`: CSV dosyası oluşturma ve indirme
- `sanitizeFilename()`: Dosya adını güvenli hale getirme
- `generateTimestamp()`: Timestamp oluşturma

### **5. `src/components/` - React Bileşenleri**
```
src/components/
├── FileUpload.tsx         # Dosya yükleme bileşeni
│   ├── Drag & drop alanı
│   ├── Mod switch'leri
│   ├── Dosya listesi
│   └── Klasör yapısı gösterimi
├── FilterPanel.tsx        # Filtreleme paneli
│   ├── Sütun filtreleri (Accordion)
│   ├── Keyword arama
│   ├── Arama terimleri (Chip'ler)
│   └── Diğer filtreler
├── DataTable.tsx          # Veri tablosu
│   ├── Sıralanabilir tablo
│   ├── Export kontrolleri
│   ├── Veri özeti
│   └── Responsive tasarım
├── MessageDisplay.tsx     # Mesaj gösterme
│   ├── Error Snackbar
│   ├── Success Snackbar
│   └── Auto-hide özelliği
└── LoadingOverlay.tsx     # Yükleme ekranı
    ├── Backdrop
    ├── CircularProgress
    └── Mesaj gösterimi
```

**Bileşen Detayları:**

#### **FileUpload.tsx**
- Drag & drop dosya yükleme
- Mod switch'leri (Tarih/Dosya modu)
- Dosya listesi gösterimi
- Klasör yapısı görselleştirme
- Dosya türü kontrolü

#### **FilterPanel.tsx**
- Accordion yapısında filtreleme
- Dinamik sütun filtreleri (slider'lar)
- Keyword arama (dahil etme/çıkarma)
- Chip'ler ile arama terimleri
- Latin alfabesi filtresi

#### **DataTable.tsx**
- Sıralanabilir tablo
- Export kontrolleri
- Veri özeti ve istatistikler
- Responsive tasarım
- Chip'ler ile kategori gösterimi

#### **MessageDisplay.tsx**
- Global error/success mesajları
- Snackbar bileşenleri
- Auto-hide özelliği
- Merkezi mesaj yönetimi

#### **LoadingOverlay.tsx**
- Global yükleme ekranı
- Backdrop ile arka plan karartma
- CircularProgress animasyonu
- Mesaj gösterimi

## 🔧 **Konfigürasyon Dosyaları**

### **`package.json` - Bağımlılıklar**
```json
{
  "dependencies": {
    "@mui/material": "^5.14.20",        # UI framework
    "@mui/icons-material": "^5.14.19",  # İkonlar
    "react": "^18.2.0",                 # React core
    "react-dropzone": "^14.2.3",        # Dosya yükleme
    "papaparse": "^5.4.1",              # CSV parsing
    "xlsx": "^0.18.5",                  # Excel export
    "zustand": "^4.4.7",                # State management
    "typescript": "^4.9.5"              # Type safety
  }
}
```

### **`tsconfig.json` - TypeScript Ayarları**
```json
{
  "compilerOptions": {
    "target": "es5",                    # JavaScript hedefi
    "jsx": "react-jsx",                # React JSX
    "strict": true,                     # Sıkı tip kontrolü
    "moduleResolution": "node"          # Modül çözümleme
  }
}
```

## 🏗️ **Bileşen Hiyerarşisi**

```
App.tsx (Ana Uygulama)
├── ThemeProvider (MUI tema)
├── Container (Layout)
│   ├── Header (Gradient başlık)
│   └── Grid (İki panel)
│       ├── Left Panel (Kontroller)
│       │   ├── FileUpload
│       │   ├── Load Button
│       │   ├── Table Buttons
│       │   └── FilterPanel
│       └── Right Panel (Tablo)
│           └── DataTable
├── MessageDisplay (Global mesajlar)
└── LoadingOverlay (Global yükleme)
```

## 🔄 **Veri Akışı**

### **1. Dosya Yükleme Akışı:**
```
FileUpload → onFilesSelected → App → CsvProcessor → Store
```

### **2. Filtreleme Akışı:**
```
FilterPanel → Store → DataTable → Filtrelenmiş Veri
```

### **3. Export Akışı:**
```
DataTable → ExportUtils → Excel/CSV Dosyası
```

### **4. State Yönetimi:**
```
User Action → Store Action → State Update → Component Re-render
```

## 🎨 **Tasarım Sistemi**

### **UI Framework:**
- **Material-UI (MUI)** kullanılıyor
- **Responsive Grid** sistemi
- **Theme Provider** ile özelleştirilebilir tema

### **Bileşenler:**
- **Accordion** bileşenleri ile düzenli filtreleme
- **Chip** bileşenleri ile etiket gösterimi
- **Snackbar** ile kullanıcı bildirimleri
- **Slider** bileşenleri ile aralık seçimi
- **Table** bileşeni ile veri gösterimi

### **Renk Paleti:**
- Primary: #1976d2 (Mavi)
- Secondary: #dc004e (Kırmızı)
- Gradient: #667eea → #764ba2 (Header)

## 🚀 **Özellikler**

### **Dosya İşleme:**
- ✅ Drag & drop CSV dosya yükleme
- ✅ Tek klasör modu
- ✅ Tarih modu (çoklu klasör)
- ✅ Dosya modu (tek CSV)
- ✅ Dosya türü kontrolü

### **Filtreleme Sistemi:**
- ✅ Dinamik sütun filtreleri (Volume, Difficulty, Growth)
- ✅ Keyword arama (dahil etme/çıkarma)
- ✅ Latin alfabesi filtresi
- ✅ Gerçek zamanlı filtreleme

### **Veri Görüntüleme:**
- ✅ Sıralanabilir tablo
- ✅ Responsive tasarım
- ✅ Veri özeti ve istatistikler
- ✅ Chip'ler ile kategori gösterimi

### **Export Özellikleri:**
- ✅ Excel export (XLSX)
- ✅ CSV export
- ✅ Özelleştirilebilir dosya adı
- ✅ Timestamp otomatik ekleme

## 🔧 **Geliştirme Komutları**

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm start

# Production build oluştur
npm run build

# Test çalıştır
npm test
```

## 📝 **Notlar**

- Bu yapı, orijinal Python Flet uygulamasının tüm özelliklerini modern web teknolojileri ile yeniden oluşturuyor
- TypeScript ile tip güvenliği sağlanıyor
- Zustand ile merkezi state yönetimi yapılıyor
- Material-UI ile modern ve responsive tasarım
- Papa Parse ile CSV işleme
- SheetJS ile Excel export
- React Dropzone ile dosya yükleme

Bu dosya yapısı, projenin tamamını anlamak ve geliştirmek için gerekli tüm bilgileri içeriyor. 