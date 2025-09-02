import requests
import json
import csv
import time
from typing import List, Dict, Any

class KeywordExtractor:
    def __init__(self, apptweak_api_key: str):
        self.apptweak_api_key = apptweak_api_key
        self.base_url = "https://public-api.apptweak.com/api/public/store"
        self.headers = {
            "accept": "application/json",
            "x-apptweak-key": self.apptweak_api_key
        }
    
    def get_app_keywords(self, app_id: str, country: str = "us", language: str = "us", 
                        device: str = "iphone", limit: int = 500, offset: int = 0) -> Dict[str, Any]:
        """Uygulamanın keyword önerilerini çeker"""
        url = f"{self.base_url}/keywords/suggestions/app.json"
        params = {
            "apps": app_id,
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
            print(f"Keyword çekme hatası (App ID: {app_id}): {e}")
            return None
    
    def extract_keywords_from_competitors(self, competitors_file: str, country: str = "us", 
                                        language: str = "us", device: str = "iphone") -> None:
        """Rakiplerin keyword'lerini çeker ve CSV'ye export eder"""
        
        # Competitor analysis dosyasını oku
        try:
            with open(competitors_file, 'r', encoding='utf-8') as f:
                competitor_data = json.load(f)
        except FileNotFoundError:
            print(f"❌ Dosya bulunamadı: {competitors_file}")
            return
        except json.JSONDecodeError:
            print(f"❌ JSON parse hatası: {competitors_file}")
            return
        
        competitors = competitor_data.get("competitors", [])
        if not competitors:
            print("❌ Rakipler bulunamadı!")
            return
        
        print(f"🏆 {len(competitors)} rakip bulundu")
        print("=" * 50)
        
        # Kullanıcıdan keyword sayısını al
        while True:
            try:
                keyword_count = int(input(f"📊 Her rakip için kaç keyword çekilsin? (1-1000): "))
                if 1 <= keyword_count <= 1000:
                    break
                else:
                    print("❌ Lütfen 1-1000 arasında bir sayı girin!")
            except ValueError:
                print("❌ Lütfen geçerli bir sayı girin!")
        
        # Token maliyetini hesapla
        total_tokens = len(competitors) * keyword_count
        print(f"\n💰 TOKEN MALİYETİ HESABI:")
        print(f"   • Rakipler: {len(competitors)}")
        print(f"   • Her rakip için keyword: {keyword_count}")
        print(f"   • Toplam token: {total_tokens}")
        print(f"   • Tahmini maliyet: ${total_tokens * 0.0001:.4f} (yaklaşık)")
        
        # Kullanıcı onayı al
        while True:
            confirm = input(f"\n❓ {total_tokens} token harcayarak devam etmek istiyor musunuz? (y/n): ").lower().strip()
            if confirm in ['y', 'yes', 'evet', 'e']:
                print("✅ Onaylandı! Keyword'ler çekiliyor...")
                break
            elif confirm in ['n', 'no', 'hayır', 'h']:
                print("❌ İşlem iptal edildi.")
                return
            else:
                print("❌ Lütfen 'y' veya 'n' girin!")
        
        # Tüm keyword'leri topla
        all_keywords = []
        
        for i, competitor in enumerate(competitors, 1):
            app_id = competitor["app_id"]
            app_title = competitor["title"]
            
            print(f"\n📱 [{i}/{len(competitors)}] {app_title} (ID: {app_id})")
            print(f"   🔍 Keyword'ler çekiliyor...")
            
            # Keyword'leri çek
            keywords_data = self.get_app_keywords(app_id, country, language, device, keyword_count, 0)
            
            if keywords_data and "result" in keywords_data and app_id in keywords_data["result"]:
                app_keywords = keywords_data["result"][app_id].get("suggestions", [])
                
                for keyword_info in app_keywords:
                    all_keywords.append({
                        "competitor_app_id": app_id,
                        "competitor_title": app_title,
                        "keyword": keyword_info.get("keyword", ""),
                        "ranking": keyword_info.get("ranking", 0),
                        "is_typo": keyword_info.get("is_typo", False),
                        "volume": keyword_info.get("volume", 0),
                        "score": keyword_info.get("score", 0)
                    })
                
                print(f"   ✅ {len(app_keywords)} keyword çekildi")
            else:
                print(f"   ❌ Keyword çekilemedi")
            
            # Rate limiting için bekleme
            time.sleep(1)
        
        # CSV'ye export et
        if all_keywords:
            # Uygulama adı ve bugünün tarihi ile dosya adı oluştur
            app_name = competitor_data.get("my_app", {}).get("title", "unknown_app")
            # Dosya adındaki özel karakterleri temizle
            safe_app_name = "".join(c for c in app_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
            safe_app_name = safe_app_name.replace(' ', '_')
            
            today_date = time.strftime("%Y-%m-%d")
            output_file = f"{safe_app_name}_competitor_keywords_{country}_{today_date}.csv"
            
            # Volume'a göre sırala (yüksek volume'dan düşüğe)
            sorted_keywords = sorted(all_keywords, key=lambda x: x['volume'], reverse=True)
            
            with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['competitor_app_id', 'competitor_title', 'keyword', 'ranking', 'is_typo', 'volume', 'score']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                for keyword_data in sorted_keywords:
                    writer.writerow(keyword_data)
            
            print(f"\n🎉 İşlem tamamlandı!")
            print(f"📊 Toplam {len(all_keywords)} keyword çekildi")
            print(f"💾 Sonuçlar '{output_file}' dosyasına kaydedildi")
            
            # Özet istatistikler
            unique_keywords = len(set([k['keyword'] for k in all_keywords]))
            print(f"🔍 Benzersiz keyword sayısı: {unique_keywords}")
            
            # Volume istatistikleri
            volumes = [k['volume'] for k in all_keywords]
            print(f"📈 En yüksek volume: {max(volumes)}")
            print(f"📉 En düşük volume: {min(volumes)}")
            print(f"📊 Ortalama volume: {sum(volumes) / len(volumes):.1f}")
            
        else:
            print("❌ Hiç keyword çekilemedi!")

def main():
    # API anahtarı
    APPTWEAK_API_KEY = "JyjSyfgl7NeQOYdMulFx3nUPN3g"
    
    print("🔑 AppTweak Keyword Extractor")
    print("=" * 50)
    
    # Competitor analysis dosyasını bul
    import glob
    competitor_files = glob.glob("competitor_analysis_*.json")
    
    if not competitor_files:
        print("❌ Hiç competitor analysis dosyası bulunamadı!")
        print("   Önce competitorsFinder.py çalıştırın!")
        return
    
    if len(competitor_files) == 1:
        selected_file = competitor_files[0]
    else:
        print("📁 Bulunan competitor analysis dosyaları:")
        for i, file in enumerate(competitor_files, 1):
            print(f"   {i}. {file}")
        
        while True:
            try:
                choice = int(input(f"\n📋 Hangi dosyayı kullanmak istiyorsunuz? (1-{len(competitor_files)}): "))
                if 1 <= choice <= len(competitor_files):
                    selected_file = competitor_files[choice - 1]
                    break
                else:
                    print("❌ Lütfen geçerli bir seçim yapın!")
            except ValueError:
                print("❌ Lütfen geçerli bir sayı girin!")
    
    print(f"✅ Seçilen dosya: {selected_file}")
    
    # Ülke kodu al
    country = input("🌍 Ülke kodu girin (varsayılan: us): ").strip() or "us"
    
    # Keyword extractor'ı başlat
    extractor = KeywordExtractor(APPTWEAK_API_KEY)
    
    # Keyword'leri çek
    extractor.extract_keywords_from_competitors(selected_file, country)

if __name__ == "__main__":
    main()
