# AppTweak Kategori Keyword Çıkarıcı

Bu proje, AppTweak API kullanarak App Store kategorilerindeki tüm keyword'leri çıkarmak için geliştirilmiştir.

## 📁 Dosyalar

- **`categoryKeywordsExtractor.py`** - Kapsamlı, interaktif keyword çıkarıcı
- **`simpleKeywordExtractor.py`** - Basit, hızlı keyword çıkarıcı
- **`requirements_keywords.txt`** - Gerekli Python paketleri

## 🚀 Kurulum

1. Gerekli paketleri yükleyin:
```bash
pip install -r requirements_keywords.txt
```

## 📱 Desteklenen Kategoriler

| Kategori | ID |
|----------|-----|
| Books | 6018 |
| Business | 6000 |
| Developer Tools | 6026 |
| Education | 6017 |
| Entertainment | 6016 |
| Finance | 6015 |
| Food & Drink | 6023 |
| Games | 6014 |
| Graphics & Design | 6027 |
| Health & Fitness | 6013 |
| Lifestyle | 6012 |
| Magazines & Newspapers | 6021 |
| Medical | 6020 |
| Music | 6011 |
| Navigation | 6010 |
| News | 6009 |
| Photo & Video | 6008 |
| Productivity | 6007 |
| Reference | 6006 |
| Social Networking | 6005 |
| Shopping | 6024 |
| Sports | 6004 |
| Travel | 6003 |
| Utilities | 6002 |
| Weather | 6001 |

## 🔧 Kullanım

### 1. Basit Keyword Çıkarıcı (Önerilen)

```bash
python simpleKeywordExtractor.py
```

**Seçenekler:**
- **1**: Tüm kategoriler için keyword'leri çek
- **2**: Tek kategori için keyword'leri çek
- **3**: Özel kategori ID'si için keyword'leri çek

### 2. Kapsamlı Keyword Çıkarıcı

```bash
python categoryKeywordsExtractor.py
```

Bu script interaktif olarak çalışır ve daha detaylı ayarlar sunar.

## 📊 Çıktı Formatları

### CSV Format
- `all_categories_keywords_{country}_{language}_{device}_{timestamp}.csv`
- `category_summary_{country}_{language}_{device}_{timestamp}.csv`

### JSON Format (sadece kapsamlı script)
- `all_categories_keywords_{country}_{language}_{device}_{timestamp}.json`

## 📈 Çıktı Alanları

Her keyword için şu bilgiler çıkarılır:
- **category_id**: Kategori ID'si
- **category_name**: Kategori adı
- **keyword**: Anahtar kelime
- **search_volume**: Arama hacmi
- **difficulty**: Zorluk seviyesi
- **country**: Ülke kodu
- **language**: Dil kodu
- **device**: Cihaz türü

## ⚠️ Önemli Notlar

1. **Rate Limiting**: API limitlerini aşmamak için kategoriler arası 1 saniye bekleme
2. **Pagination**: Her kategori için maksimum 100 keyword per request
3. **API Key**: Script'te API anahtarınızın doğru olduğundan emin olun
4. **Dosya Boyutu**: Tüm kategoriler için büyük dosyalar oluşabilir

## 🔍 Örnek Kullanım

### Tek Kategori İçin
```python
from simpleKeywordExtractor import extract_single_category_keywords

# Games kategorisi için keyword'leri çek
keywords = extract_single_category_keywords(6014, "Games", "YOUR_API_KEY")
```

### Tüm Kategoriler İçin
```python
from simpleKeywordExtractor import extract_all_categories_keywords

# Tüm kategoriler için keyword'leri çek
extract_all_categories_keywords("YOUR_API_KEY", country="us", language="us", device="iphone")
```

## 📁 Dosya Yapısı

```
CompetiterFinder/
├── categoryKeywordsExtractor.py      # Kapsamlı script
├── simpleKeywordExtractor.py         # Basit script
├── requirements_keywords.txt          # Gerekli paketler
├── README_Keywords.md                # Bu dosya
└── [çıktı dosyaları]                # Script çalıştırıldıktan sonra oluşur
```

## 🐛 Sorun Giderme

### API Hatası
- API anahtarınızın doğru olduğundan emin olun
- API limitlerini kontrol edin

### Dosya Yazma Hatası
- Dizin yazma izinlerini kontrol edin
- Disk alanının yeterli olduğundan emin olun

### Rate Limiting
- Script otomatik olarak rate limiting yapar
- Çok hızlı çalıştırmayın

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Hata mesajlarını kontrol edin
2. API anahtarınızın geçerli olduğundan emin olun
3. İnternet bağlantınızı kontrol edin
