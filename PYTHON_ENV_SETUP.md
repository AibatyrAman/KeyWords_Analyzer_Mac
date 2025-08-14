# Python Uygulamaları için Environment Setup

## OpenAI API Key Konfigürasyonu

### 1. Gerekli Paketleri Yükleyin
```bash
pip install -r requirements.txt
```

### 2. .env Dosyası Oluşturun
Proje ana dizininde `.env` dosyası oluşturun:

```bash
# .env dosyası oluştur
echo "OPENAI_API_KEY=your_actual_openai_api_key_here" > .env
```

### 3. .env Dosyası İçeriği
```
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

### 4. Güvenlik için .gitignore Güncellemesi
`.gitignore` dosyasına şu satırı ekleyin:
```
.env
```

## Uygulamalar

### tsk_generator.py
- Tkinter tabanlı ASO aracı
- Klasör sürükle-bırak desteği
- Title/Subtitle üretimi

### aso_generate_flet_win.py
- Flet tabanlı modern arayüz
- Çoklu klasör desteği
- Gelişmiş filtreleme özellikleri

## Önemli Notlar

- API anahtarınızı asla kod içinde tutmayın
- .env dosyasını GitHub'a pushlamayın
- API anahtarınızı düzenli olarak değiştirin
- OpenAI API kullanımınızı takip edin

## Hata Durumları

Eğer "OPENAI_API_KEY environment variable bulunamadı!" hatası alırsanız:
1. .env dosyasının doğru konumda olduğunu kontrol edin
2. API anahtarının doğru formatta olduğunu kontrol edin
3. python-dotenv paketinin yüklü olduğunu kontrol edin
