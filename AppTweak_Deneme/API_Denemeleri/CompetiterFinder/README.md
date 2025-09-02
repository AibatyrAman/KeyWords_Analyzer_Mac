# AppTweak Rakipler Analiz Sistemi

Bu sistem, AppTweak API'si kullanarak mobil uygulamanızın rakiplerini otomatik olarak bulur ve analiz eder.

## 🚀 Özellikler

- **Otomatik Rakipler Bulma**: Uygulamanızın DNA kategorisindeki tüm uygulamaları analiz eder
- **"Customers Also Bought" Analizi**: Kullanıcıların birlikte indirdiği uygulamaları inceler
- **AI Destekli Analiz**: GPT API ile akıllı rakip analizi yapar
- **Detaylı Raporlama**: JSON formatında kapsamlı raporlar oluşturur
- **Keyword Extraction**: Rakiplerin App Store keyword'lerini otomatik çeker
- **CSV Export**: Keyword'leri CSV formatında export eder
- **Token Maliyet Hesaplama**: API kullanım maliyetini önceden hesaplar

## 📋 Gereksinimler

- Python 3.7+
- AppTweak API anahtarı
- OpenAI GPT API anahtarı

## 🛠️ Kurulum

1. Gerekli paketleri yükleyin:
```bash
pip install -r requirements.txt
```

2. API anahtarlarınızı `competitorsFinder.py` dosyasında güncelleyin:
```python
APPTWEAK_API_KEY = "your_apptweak_api_key"
GPT_API_KEY = "your_openai_api_key"
```

## 🎯 Kullanım

### 1. Rakipleri Bulma

```bash
python competitorsFinder.py
```

Program size şu bilgileri soracak:
- **Uygulama ID'si**: Analiz edilecek uygulamanın App Store ID'si
- **Ülke Kodu**: Analiz edilecek ülke (varsayılan: us)

### 2. Rakiplerin Keyword'lerini Çekme

```bash
python keywordExtractor.py
```

Program size şu bilgileri soracak:
- **Competitor Analysis Dosyası**: Hangi analiz dosyasını kullanacağınız
- **Ülke Kodu**: Keyword'lerin çekileceği ülke (varsayılan: us)
- **Keyword Sayısı**: Her rakip için kaç keyword çekileceği (1-1000)
- **Onay**: Token maliyeti için onay

### Programatik Kullanım

```python
from competitorsFinder import CompetitorAnalyzer

# Analizör'ü başlat
analyzer = CompetitorAnalyzer(
    apptweak_api_key="your_key",
    gpt_api_key="your_key"
)

# Rakipleri bul
result = analyzer.find_competitors("6739486117", "us")

# Sonuçları kullan
print(f"Bulunan rakip sayısı: {len(result['competitors'])}")
```

## 📊 Çıktı Formatı

Sistem şu JSON formatında sonuç döndürür:

```json
{
  "my_app": {
    "app_id": "6739486117",
    "title": "Deco: AI Remodel & Home Design",
    "dna_subclass_id": 66,
    "dna_subclass_label": "Furniture & Home Design Planners"
  },
  "analysis_summary": {
    "total_apps_analyzed": 150,
    "competitors_found": 12,
    "dna_category_apps": 69,
    "customers_also_bought_apps": 10
  },
  "competitors": [
    {
      "app_id": "1234567890",
      "title": "Competitor App Name",
      "reason": "Benzer AI tabanlı ev tasarım özellikleri"
    }
  ]
}
```

## 🔍 Analiz Süreci

1. **Metadata Çekme**: Uygulamanızın AppTweak metadata'sını çeker
2. **DNA Kategorisi**: Uygulamanızın DNA subclass ID'sini belirler
3. **Kategori Tarama**: Aynı kategorideki tüm uygulamaları bulur
4. **İlişkili Uygulamalar**: "Customers also bought" listesini ekler
5. **Toplu Metadata**: Tüm potansiyel rakiplerin metadata'sını çeker
6. **AI Analizi**: GPT API ile rakip olup olmadığını analiz eder
7. **Raporlama**: Sonuçları JSON formatında kaydeder

## 📁 Çıktı Dosyaları

Program çalıştığında şu dosyalar oluşturulur:

### Competitor Analysis
- `competitor_analysis_{app_id}_{country}.json`: Detaylı analiz raporu

### Keyword Extraction
- `competitor_keywords_{country}.csv`: Rakiplerin keyword'leri CSV formatında
  - `competitor_app_id`: Rakip uygulama ID'si
  - `competitor_title`: Rakip uygulama başlığı
  - `keyword`: App Store keyword'ü
  - `ranking`: Keyword sıralaması
  - `is_typo`: Typo olup olmadığı
  - `volume`: Keyword hacmi
  - `score`: Keyword skoru

## ⚠️ Önemli Notlar

- **Rate Limiting**: AppTweak API'si için rate limiting uygulanmıştır
- **Batch Processing**: Metadata çekme işlemi 10'arlı gruplar halinde yapılır
- **API Maliyeti**: Her API çağrısı kredi tüketir, dikkatli kullanın
- **GPT Analizi**: Uzun description'lar için token limiti aşılabilir

## 🐛 Hata Durumları

- **API Anahtarı Hatası**: API anahtarlarınızı kontrol edin
- **Uygulama Bulunamadı**: App ID'sinin doğru olduğundan emin olun
- **DNA ID Eksik**: Uygulamanın DNA kategorisi tanımlanmamış olabilir
- **GPT API Hatası**: OpenAI API anahtarınızı ve kredinizi kontrol edin

## 📈 Örnek Kullanım

### 1. Rakipleri Bulma

```bash
$ python competitorsFinder.py
🏠 AppTweak Rakipler Analiz Sistemi
==================================================
📱 Uygulama ID'sini girin: 6739486117
🌍 Ülke kodu girin (varsayılan: us): us

🔍 6739486117 ID'li uygulama için rakip analizi başlatılıyor...
📱 Uygulama metadata'sı çekiliyor...
✅ Uygulama: Deco: AI Remodel & Home Design
📊 DNA Subclass ID: 66
📈 DNA kategorisindeki uygulamalar çekiliyor (ID: 66)...
📊 DNA kategorisinde 69 uygulama bulundu
🔗 Toplam 20 uygulama ID'si analiz edilecek (5'er gruplar halinde)
📋 Uygulamaların metadata'ları çekiliyor...
📝 20 uygulama için veri hazırlandı
🤖 GPT ile rakip analizi yapılıyor (5'er uygulama grupları halinde)...
✅ 5 uygulama analiz edildi, 2 rakip bulundu
✅ 5 uygulama analiz edildi, 3 rakip bulundu
✅ 5 uygulama analiz edildi, 2 rakip bulundu
✅ 5 uygulama analiz edildi, 2 rakip bulundu
✅ Analiz tamamlandı! 9 rakip bulundu.

==================================================
📊 ANALİZ SONUÇLARI
==================================================
🎯 Benim Uygulamam: Deco: AI Remodel & Home Design (ID: 6739486117)
📂 Kategori: Furniture & Home Design Planners
📈 Analiz edilen toplam uygulama: 20
🏆 Bulunan rakip sayısı: 9

💾 Sonuçlar 'competitor_analysis_6739486117_us.json' dosyasına kaydedildi.
```

### 2. Rakiplerin Keyword'lerini Çekme

```bash
$ python keywordExtractor.py
🔑 AppTweak Keyword Extractor
==================================================
📁 Bulunan competitor analysis dosyaları:
   1. competitor_analysis_6739486117_us.json
   2. competitor_analysis_6743965028_us.json

📋 Hangi dosyayı kullanmak istiyorsunuz? (1-2): 1
✅ Seçilen dosya: competitor_analysis_6739486117_us.json
🌍 Ülke kodu girin (varsayılan: us): us
🏆 8 rakip bulundu
==================================================
📊 Her rakip için kaç keyword çekilsin? (1-1000): 100

💰 TOKEN MALİYETİ HESABI:
   • Rakipler: 8
   • Her rakip için keyword: 100
   • Toplam token: 800
   • Tahmini maliyet: $0.0800 (yaklaşık)

❓ 800 token harcayarak devam etmek istiyor musunuz? (y/n): y
✅ Onaylandı! Keyword'ler çekiliyor...

📱 [1/8] AI house design - Renomo (ID: 6503702359)
   🔍 Keyword'ler çekiliyor...
   ✅ 100 keyword çekildi

📱 [2/8] NewHome AI (ID: 6747612920)
   🔍 Keyword'ler çekiliyor...
   ✅ 100 keyword çekildi

🎉 İşlem tamamlandı!
📊 Toplam 726 keyword çekildi
💾 Sonuçlar 'competitor_keywords_us.csv' dosyasına kaydedildi
🔍 Benzersiz keyword sayısı: 628
```

## 🤝 Katkıda Bulunma

Bu projeye katkıda bulunmak için:
1. Fork yapın
2. Feature branch oluşturun
3. Değişikliklerinizi commit edin
4. Pull request gönderin

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.


