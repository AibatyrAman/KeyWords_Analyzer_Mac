# ASO Keywords Analyzer

Professional Edition - Dinamik Sütun Desteği

## Kurulum

### 1. Dependencies Kurulumu
```bash
npm install
```

### 2. Environment Variables Kurulumu

#### .env Dosyası Oluşturma
Proje ana dizininde `.env` dosyası oluşturun:

```bash
cp env.example .env
```

#### API Key Ekleme
`.env` dosyasını düzenleyin ve OpenAI API key'inizi ekleyin:

```env
# OpenAI API Configuration
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here

# App Configuration
REACT_APP_APP_NAME=ASO Keywords Analyzer
REACT_APP_APP_VERSION=1.0.0

# API Endpoints
REACT_APP_OPENAI_API_URL=https://api.openai.com/v1/chat/completions

# Development Configuration
REACT_APP_DEBUG_MODE=false
REACT_APP_LOG_LEVEL=info
```

**Önemli:** `REACT_APP_OPENAI_API_KEY` değerini kendi API key'iniz ile değiştirin.

### 3. Uygulamayı Başlatma
```bash
npm start
```

## Özellikler

- **Dinamik Sütun Desteği**: CSV dosyalarındaki farklı sütun yapılarını otomatik algılama
- **GPT API Entegrasyonu**: OpenAI GPT-4 ile akıllı keyword analizi
- **Duplicate Removal**: Gelişmiş duplicate keyword temizleme stratejileri
- **Exact Word Matching**: Tam kelime eşleşmesi ile filtreleme
- **Date Mode**: Tarih bazlı klasör yapısı desteği
- **Export Options**: Excel ve CSV formatlarında veri dışa aktarma

## Güvenlik

- `.env` dosyası `.gitignore`'a eklenmiştir
- API key'ler asla git repository'ye commit edilmez
- `env.example` dosyası template olarak kullanılır

## API Key Alma

1. [OpenAI Platform](https://platform.openai.com/) adresine gidin
2. Hesap oluşturun veya giriş yapın
3. API Keys bölümünden yeni key oluşturun
4. Key'i `.env` dosyasına ekleyin

## Destek

Herhangi bir sorun yaşarsanız, lütfen issue açın veya iletişime geçin.
