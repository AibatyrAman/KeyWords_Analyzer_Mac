import requests
import json
import time
import csv
from typing import Dict, List, Any
import os

class CategoryKeywordsExtractor:
    def __init__(self, apptweak_api_key: str):
        self.apptweak_api_key = apptweak_api_key
        self.base_url = "https://public-api.apptweak.com/api/public/store"
        self.headers = {
            "accept": "application/json",
            "x-apptweak-key": self.apptweak_api_key
        }
        
        # App Store kategorileri ve ID'leri
        self.categories = {
            "All": 0,
            "Books": 6018,
            "Business": 6000,
            "Developer Tools": 6026,
            "Education": 6017,
            "Entertainment": 6016,
            "Finance": 6015,
            "Food & Drink": 6023,
            "Games": 6014,
            "Graphics & Design": 6027,
            "Health & Fitness": 6013,
            "Lifestyle": 6012,
            "Magazines & Newspapers": 6021,
            "Medical": 6020,
            "Music": 6011,
            "Navigation": 6010,
            "News": 6009,
            "Photo & Video": 6008,
            "Productivity": 6007,
            "Reference": 6006,
            "Social Networking": 6005,
            "Shopping": 6024,
            "Sports": 6004,
            "Travel": 6003,
            "Utilities": 6002,
            "Weather": 6001
        }
    
    def get_keywords_for_category(self, category_id: int, country: str = "us", language: str = "us", 
                                 device: str = "iphone", limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Belirli bir kategori için keyword önerilerini çeker"""
        url = f"{self.base_url}/keywords/suggestions/category.json"
        params = {
            "categories": category_id,
            "country": country,
            "language": language,
            "device": device,
            "limit": limit,
            "offset": offset
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Kategori {category_id} için keyword çekme hatası: {e}")
            return None
    
    def get_all_keywords_for_category(self, category_id: int, category_name: str, 
                                    country: str = "us", language: str = "us", 
                                    device: str = "iphone") -> List[Dict[str, Any]]:
        """Bir kategori için tüm keyword'leri çeker (pagination ile)"""
        print(f"🔍 {category_name} kategorisi için keyword'ler çekiliyor...")
        
        all_keywords = []
        offset = 0
        limit = 100  # Maksimum limit
        total_keywords = 0
        
        while True:
            print(f"   📥 Offset: {offset}, Limit: {limit}")
            
            result = self.get_keywords_for_category(
                category_id, country, language, device, limit, offset
            )
            
            if not result or "result" not in result:
                print(f"   ❌ {category_name} kategorisi için veri alınamadı")
                break
            
            keywords = result["result"]
            if not keywords:
                print(f"   ✅ {category_name} kategorisi için tüm keyword'ler alındı")
                break
            
            # Keyword'leri işle
            for keyword_data in keywords:
                keyword_info = {
                    "category_id": category_id,
                    "category_name": category_name,
                    "keyword": keyword_data.get("keyword", ""),
                    "search_volume": keyword_data.get("search_volume", 0),
                    "difficulty": keyword_data.get("difficulty", 0),
                    "country": country,
                    "language": language,
                    "device": device
                }
                all_keywords.append(keyword_info)
            
            total_keywords += len(keywords)
            print(f"   📊 {len(keywords)} keyword alındı, toplam: {total_keywords}")
            
            # Eğer daha az keyword geldiyse, tüm veriler alınmış demektir
            if len(keywords) < limit:
                break
            
            offset += limit
            
            # Rate limiting için bekleme
            time.sleep(0.5)
        
        print(f"✅ {category_name} kategorisi için {total_keywords} keyword başarıyla alındı")
        return all_keywords
    
    def extract_all_categories_keywords(self, country: str = "us", language: str = "us", 
                                      device: str = "iphone", output_format: str = "csv") -> None:
        """Tüm kategoriler için keyword'leri çeker"""
        print("🚀 Tüm kategoriler için keyword çıkarma işlemi başlatılıyor...")
        print("=" * 60)
        
        all_keywords = []
        successful_categories = 0
        failed_categories = 0
        
        # Her kategori için keyword'leri çek
        for category_name, category_id in self.categories.items():
            if category_id == 0:  # "All" kategorisini atla
                print(f"⏭️  '{category_name}' kategorisi atlanıyor (genel kategori)")
                continue
            
            try:
                category_keywords = self.get_all_keywords_for_category(
                    category_id, category_name, country, language, device
                )
                
                if category_keywords:
                    all_keywords.extend(category_keywords)
                    successful_categories += 1
                    print(f"✅ {category_name}: {len(category_keywords)} keyword")
                else:
                    failed_categories += 1
                    print(f"❌ {category_name}: Keyword alınamadı")
                
            except Exception as e:
                failed_categories += 1
                print(f"❌ {category_name}: Hata - {e}")
            
            # Kategoriler arası bekleme
            time.sleep(1)
            print("-" * 40)
        
        # Sonuçları özetle
        print("\n" + "=" * 60)
        print("📊 KEYWORD ÇIKARMA SONUÇLARI")
        print("=" * 60)
        print(f"✅ Başarılı kategoriler: {successful_categories}")
        print(f"❌ Başarısız kategoriler: {failed_categories}")
        print(f"📝 Toplam keyword sayısı: {len(all_keywords)}")
        
        # Sonuçları kaydet
        if all_keywords:
            self.save_keywords(all_keywords, country, language, device, output_format)
        else:
            print("❌ Kaydedilecek keyword bulunamadı!")
    
    def save_keywords(self, keywords: List[Dict[str, Any]], country: str, language: str, 
                     device: str, output_format: str) -> None:
        """Keyword'leri dosyaya kaydeder"""
        timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
        
        if output_format.lower() == "csv":
            filename = f"all_categories_keywords_{country}_{language}_{device}_{timestamp}.csv"
            
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['category_id', 'category_name', 'keyword', 'search_volume', 
                             'difficulty', 'country', 'language', 'device']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                for keyword in keywords:
                    writer.writerow(keyword)
            
            print(f"💾 Keyword'ler CSV dosyasına kaydedildi: {filename}")
            
        elif output_format.lower() == "json":
            filename = f"all_categories_keywords_{country}_{language}_{device}_{timestamp}.json"
            
            output_data = {
                "metadata": {
                    "total_keywords": len(keywords),
                    "categories_count": len(set(k['category_name'] for k in keywords)),
                    "country": country,
                    "language": language,
                    "device": device,
                    "extraction_date": timestamp
                },
                "keywords": keywords
            }
            
            with open(filename, 'w', encoding='utf-8') as jsonfile:
                json.dump(output_data, jsonfile, ensure_ascii=False, indent=2)
            
            print(f"💾 Keyword'ler JSON dosyasına kaydedildi: {filename}")
        
        # Kategori bazında özet dosyası
        self.create_category_summary(keywords, country, language, device, timestamp)
    
    def create_category_summary(self, keywords: List[Dict[str, Any]], country: str, 
                              language: str, device: str, timestamp: str) -> None:
        """Kategori bazında özet rapor oluşturur"""
        summary_filename = f"category_summary_{country}_{language}_{device}_{timestamp}.csv"
        
        # Kategori bazında grupla
        category_stats = {}
        for keyword in keywords:
            category_name = keyword['category_name']
            if category_name not in category_stats:
                category_stats[category_name] = {
                    'keyword_count': 0,
                    'total_search_volume': 0,
                    'avg_difficulty': 0,
                    'difficulty_sum': 0
                }
            
            category_stats[category_name]['keyword_count'] += 1
            category_stats[category_name]['total_search_volume'] += keyword['search_volume']
            category_stats[category_name]['difficulty_sum'] += keyword['difficulty']
        
        # Ortalama zorluk hesapla
        for category in category_stats.values():
            if category['keyword_count'] > 0:
                category['avg_difficulty'] = round(category['difficulty_sum'] / category['keyword_count'], 2)
        
        # CSV'ye kaydet
        with open(summary_filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['category_name', 'keyword_count', 'total_search_volume', 'avg_difficulty']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for category_name, stats in category_stats.items():
                writer.writerow({
                    'category_name': category_name,
                    'keyword_count': stats['keyword_count'],
                    'total_search_volume': stats['total_search_volume'],
                    'avg_difficulty': stats['avg_difficulty']
                })
        
        print(f"📊 Kategori özeti kaydedildi: {summary_filename}")
        
        # Özet bilgileri göster
        print("\n📈 KATEGORİ BAZINDA ÖZET:")
        print("-" * 50)
        for category_name, stats in sorted(category_stats.items(), 
                                         key=lambda x: x[1]['keyword_count'], reverse=True):
            print(f"{category_name:25} | {stats['keyword_count']:4} keyword | "
                  f"Search Volume: {stats['total_search_volume']:6} | "
                  f"Avg Difficulty: {stats['avg_difficulty']:5}")

def main():
    print("🔑 AppTweak Kategori Keyword Çıkarıcı")
    print("=" * 50)
    
    # API anahtarı
    APPTWEAK_API_KEY = "JyjSyfgl7NeQOYdMulFx3nUPN3g"
    
    # Kullanıcı tercihleri
    country = input("🌍 Ülke kodu girin (varsayılan: us): ").strip() or "us"
    language = input("🗣️  Dil kodu girin (varsayılan: us): ").strip() or "us"
    device = input("📱 Cihaz türü girin (varsayılan: iphone): ").strip() or "iphone"
    
    print("\n📁 Çıktı formatı seçin:")
    print("1. CSV (Excel uyumlu)")
    print("2. JSON")
    format_choice = input("Seçiminiz (1/2, varsayılan: 1): ").strip() or "1"
    output_format = "csv" if format_choice == "1" else "json"
    
    print(f"\n✅ Seçilen ayarlar:")
    print(f"   🌍 Ülke: {country}")
    print(f"   🗣️  Dil: {language}")
    print(f"   📱 Cihaz: {device}")
    print(f"   📁 Format: {output_format.upper()}")
    
    confirm = input("\n🚀 İşlemi başlatmak istiyor musunuz? (y/n, varsayılan: y): ").strip().lower()
    if confirm in ['n', 'no']:
        print("❌ İşlem iptal edildi.")
        return
    
    print("\n" + "=" * 50)
    
    # Keyword çıkarıcıyı başlat
    extractor = CategoryKeywordsExtractor(APPTWEAK_API_KEY)
    
    try:
        # Tüm kategoriler için keyword'leri çek
        extractor.extract_all_categories_keywords(country, language, device, output_format)
        
        print("\n🎉 İşlem başarıyla tamamlandı!")
        print("📁 Sonuç dosyaları mevcut dizinde oluşturuldu.")
        
    except KeyboardInterrupt:
        print("\n\n⏹️  İşlem kullanıcı tarafından durduruldu.")
    except Exception as e:
        print(f"\n❌ Beklenmeyen hata: {e}")

if __name__ == "__main__":
    main()
