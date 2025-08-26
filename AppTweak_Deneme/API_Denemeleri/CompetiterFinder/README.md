# AppTweak Rakipler Analiz Sistemi

Bu sistem, AppTweak API'si kullanarak mobil uygulamanızın rakiplerini otomatik olarak bulur ve analiz eder.

## 🚀 Özellikler

- **Otomatik Rakipler Bulma**: Uygulamanızın DNA kategorisindeki tüm uygulamaları analiz eder
- **"Customers Also Bought" Analizi**: Kullanıcıların birlikte indirdiği uygulamaları inceler
- **AI Destekli Analiz**: GPT API ile akıllı rakip analizi yapar
- **Detaylı Raporlama**: JSON formatında kapsamlı raporlar oluşturur

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

### Komut Satırından Çalıştırma

```bash
python competitorsFinder.py
```

Program size şu bilgileri soracak:
- **Uygulama ID'si**: Analiz edilecek uygulamanın App Store ID'si
- **Ülke Kodu**: Analiz edilecek ülke (varsayılan: us)

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
- `competitor_analysis_{app_id}_{country}.json`: Detaylı analiz raporu

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
🔗 Toplam 79 benzersiz uygulama ID'si (DNA + Customers also bought)
📋 Uygulamaların metadata'ları çekiliyor...
📝 79 uygulama için veri hazırlandı
🤖 GPT ile rakip analizi yapılıyor...
✅ Analiz tamamlandı! 12 rakip bulundu.

==================================================
📊 ANALİZ SONUÇLARI
==================================================
🎯 Benim Uygulamam: Deco: AI Remodel & Home Design (ID: 6739486117)
📂 Kategori: Furniture & Home Design Planners
📈 Analiz edilen toplam uygulama: 79
🏆 Bulunan rakip sayısı: 12

🎯 BULUNAN RAKİPLER:
------------------------------
1. Room Planner (ID: 836767708)
   💡 Neden: Benzer AI tabanlı ev tasarım özellikleri

2. Planner 5D (ID: 6464476667)
   💡 Neden: 3D ev tasarım ve dekorasyon odaklı

💾 Sonuçlar 'competitor_analysis_6739486117_us.json' dosyasına kaydedildi.
```

## 🤝 Katkıda Bulunma

Bu projeye katkıda bulunmak için:
1. Fork yapın
2. Feature branch oluşturun
3. Değişikliklerinizi commit edin
4. Pull request gönderin

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
