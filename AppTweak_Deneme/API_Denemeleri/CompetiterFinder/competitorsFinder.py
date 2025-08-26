import requests
import json
import time
from typing import List, Dict, Any
from openai import OpenAI

class CompetitorAnalyzer:
    def __init__(self, apptweak_api_key: str, gpt_api_key: str):
        self.apptweak_api_key = apptweak_api_key
        self.gpt_api_key = gpt_api_key
        self.base_url = "https://public-api.apptweak.com/api/public/store"
        self.headers = {
            "accept": "application/json",
            "x-apptweak-key": self.apptweak_api_key
        }
        
        # GPT API client'ını ayarla
        self.client = OpenAI(api_key=self.gpt_api_key)
    
    def get_app_metadata(self, app_id: str, country: str = "us", language: str = "us", device: str = "iphone") -> Dict[str, Any]:
        """Uygulamanın metadata'sını çeker"""
        url = f"{self.base_url}/apps/metadata.json"
        params = {
            "apps": app_id,
            "country": country,
            "language": language,
            "device": device
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Metadata çekme hatası: {e}")
            return None
    
    def get_dna_charts(self, dna_id: int, country: str = "us", store: str = "ios", type_: str = "free") -> Dict[str, Any]:
        """DNA kategorisindeki tüm uygulamaları çeker"""
        url = f"{self.base_url}/charts/dna/current.json"
        params = {
            "dna_ids": dna_id,
            "countries": country,
            "type": type_,
            "store": store
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"DNA charts çekme hatası: {e}")
            return None
    
    def get_multiple_apps_metadata(self, app_ids: List[str], country: str = "us", language: str = "us", device: str = "iphone") -> Dict[str, Any]:
        """Birden fazla uygulamanın metadata'sını çeker"""
        # AppTweak API'si tek seferde maksimum 10 app ID'si kabul ediyor
        batch_size = 5  # Daha küçük batch size
        all_results = {}
        
        for i in range(0, len(app_ids), batch_size):
            batch = app_ids[i:i + batch_size]
            url = f"{self.base_url}/apps/metadata.json"
            params = {
                "apps": ",".join(batch),
                "country": country,
                "language": language,
                "device": device
            }
            
            try:
                response = requests.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                batch_result = response.json()
                
                if "result" in batch_result:
                    all_results.update(batch_result["result"])
                
                # Rate limiting için daha uzun bekleme
                time.sleep(1)
                
            except requests.exceptions.RequestException as e:
                print(f"Batch metadata çekme hatası: {e}")
                # Hata durumunda tek tek deneyelim
                for app_id in batch:
                    try:
                        single_result = self.get_app_metadata(app_id, country, language, device)
                        if single_result and "result" in single_result:
                            all_results.update(single_result["result"])
                        time.sleep(0.5)
                    except:
                        continue
                continue
        
        return {"result": all_results}
    
    def analyze_competitors_with_gpt(self, my_app_description: str, competitors_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """GPT API kullanarak rakip analizi yapar - 5'er uygulama grupları halinde"""
        
        all_competitors = []
        
        # 5'er uygulama grupları halinde analiz et
        batch_size = 5
        for i in range(0, len(competitors_data), batch_size):
            batch = competitors_data[i:i + batch_size]
            
            # GPT'ye gönderilecek prompt'u hazırla
            prompt = f"""
            Aşağıdaki uygulama açıklamasına sahip bir uygulama için rakip analizi yapmanı istiyorum.
            
            BENİM UYGULAMAM:
            {my_app_description[:1000]}  # Description'ı kısalt
            
            Aşağıdaki {len(batch)} uygulamayı analiz et ve hangilerinin gerçek rakip olduğunu belirle:
            
            """
            
            for comp in batch:
                # Description'ı kısalt
                short_desc = comp['description'][:500] if len(comp['description']) > 500 else comp['description']
                prompt += f"""
            UYGULAMA ID: {comp['app_id']}
            BAŞLIK: {comp['title']}
            AÇIKLAMA: {short_desc}
            ---
            """
            
            prompt += """
            Her uygulama için şu kriterleri değerlendir:
            1. Benzer işlevsellik ve özellikler
            2. Hedef kullanıcı kitlesi
            3. Ana özelliklerin benzerliği
            4. Pazarlama pozisyonu
            
            Sadece gerçek rakip olan uygulamaları JSON formatında döndür:
            {
                "competitors": [
                    {
                        "app_id": "uygulama_id",
                        "title": "uygulama_başlığı",
                        "reason": "rakip olma nedeni"
                    }
                ]
            }
            """
            
            try:
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Sen bir mobil uygulama pazar analisti. Uygulamaların rakip olup olmadığını analiz ediyorsun."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=1000
                )
                
                # GPT'den gelen yanıtı parse et
                gpt_response = response.choices[0].message.content.strip()
                
                # JSON formatını bul ve parse et
                try:
                    # JSON bloğunu bul
                    start_idx = gpt_response.find('{')
                    end_idx = gpt_response.rfind('}') + 1
                    json_str = gpt_response[start_idx:end_idx]
                    
                    result = json.loads(json_str)
                    batch_competitors = result.get("competitors", [])
                    all_competitors.extend(batch_competitors)
                    
                    print(f"✅ {len(batch)} uygulama analiz edildi, {len(batch_competitors)} rakip bulundu")
                    
                except json.JSONDecodeError as e:
                    print(f"GPT yanıtını parse etme hatası: {e}")
                    print(f"GPT yanıtı: {gpt_response}")
                    continue
                    
            except Exception as e:
                print(f"GPT API hatası: {e}")
                continue
            
            # Her batch arasında kısa bekleme
            time.sleep(1)
        
        return all_competitors
    
    def find_competitors(self, app_id: str, country: str = "us") -> Dict[str, Any]:
        """Ana fonksiyon: Rakipleri bulur ve analiz eder"""
        
        print(f"🔍 {app_id} ID'li uygulama için rakip analizi başlatılıyor...")
        
        # 1. Uygulamanın metadata'sını çek
        print("📱 Uygulama metadata'sı çekiliyor...")
        app_metadata = self.get_app_metadata(app_id, country)
        
        if not app_metadata or "result" not in app_metadata:
            return {"error": "Uygulama metadata'sı çekilemedi"}
        
        app_data = app_metadata["result"].get(app_id, {})
        if not app_data:
            return {"error": "Uygulama bulunamadı"}
        
        my_description = app_data.get("metadata", {}).get("description", "")
        my_title = app_data.get("metadata", {}).get("title", "")
        dna_info = app_data.get("metadata", {}).get("dna", {})
        customers_also_bought = app_data.get("metadata", {}).get("customers_also_bought", [])
        
        print(f"✅ Uygulama: {my_title}")
        print(f"📊 DNA Subclass ID: {dna_info.get('subclass_id', 'Bilinmiyor')}")
        
        # 2. DNA kategorisindeki tüm uygulamaları çek
        dna_id = dna_info.get("subclass_id")
        if not dna_id:
            return {"error": "DNA subclass ID bulunamadı"}
        
        print(f"📈 DNA kategorisindeki uygulamalar çekiliyor (ID: {dna_id})...")
        dna_charts = self.get_dna_charts(dna_id, country)
        
        if not dna_charts or "result" not in dna_charts:
            return {"error": "DNA charts çekilemedi"}
        
        # DNA charts'tan app ID'lerini al
        dna_app_ids = [item["application_id"] for item in dna_charts["result"]]
        print(f"📊 DNA kategorisinde {len(dna_app_ids)} uygulama bulundu")
        
        # 3. "Customers also bought" listesini ekle
        all_app_ids = list(set(dna_app_ids + customers_also_bought))
        
        # Kendi uygulamamızı listeden çıkar
        if app_id in all_app_ids:
            all_app_ids.remove(app_id)
        
        # Token limitini aşmamak için sadece ilk 20 uygulamayı al
        all_app_ids = all_app_ids[:20]
        print(f"🔗 Toplam {len(all_app_ids)} uygulama ID'si analiz edilecek (5'er gruplar halinde)")
        
        # 4. Tüm uygulamaların metadata'sını çek
        print("📋 Uygulamaların metadata'ları çekiliyor...")
        all_metadata = self.get_multiple_apps_metadata(all_app_ids, country)
        
        if not all_metadata or "result" not in all_metadata:
            return {"error": "Uygulamaların metadata'ları çekilemedi"}
        
        # 5. Analiz için veri hazırla
        competitors_data = []
        for comp_app_id, comp_data in all_metadata["result"].items():
            comp_metadata = comp_data.get("metadata", {})
            competitors_data.append({
                "app_id": comp_app_id,
                "title": comp_metadata.get("title", ""),
                "description": comp_metadata.get("description", "")
            })
        
        print(f"📝 {len(competitors_data)} uygulama için veri hazırlandı")
        
        # 6. GPT ile rakip analizi (5'er gruplar halinde)
        print("🤖 GPT ile rakip analizi yapılıyor (5'er uygulama grupları halinde)...")
        competitors = self.analyze_competitors_with_gpt(my_description, competitors_data)
        
        # 7. Sonuçları formatla
        result = {
            "my_app": {
                "app_id": app_id,
                "title": my_title,
                "dna_subclass_id": dna_id,
                "dna_subclass_label": dna_info.get("subclass_label", "")
            },
            "analysis_summary": {
                "total_apps_analyzed": len(competitors_data),
                "competitors_found": len(competitors),
                "dna_category_apps": len(dna_app_ids),
                "customers_also_bought_apps": len(customers_also_bought)
            },
            "competitors": competitors
        }
        
        print(f"✅ Analiz tamamlandı! {len(competitors)} rakip bulundu.")
        return result

def main():
    # API anahtarları
    APPTWEAK_API_KEY = "JyjSyfgl7NeQOYdMulFx3nUPN3g"
    GPT_API_KEY = "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"
    
    print("🏠 AppTweak Rakipler Analiz Sistemi")
    print("=" * 50)
    
    # Kullanıcıdan bilgi al
    app_id = input("📱 Uygulama ID'sini girin: ").strip()
    country = input("🌍 Ülke kodu girin (varsayılan: us): ").strip() or "us"
    print()
    
    # Analizör'ü başlat
    analyzer = CompetitorAnalyzer(APPTWEAK_API_KEY, GPT_API_KEY)
    
    # Rakipleri bul
    result = analyzer.find_competitors(app_id, country)
    
    # Sonuçları göster
    if "error" in result:
        print(f"❌ Hata: {result['error']}")
    else:
        print("\n" + "=" * 50)
        print("📊 ANALİZ SONUÇLARI")
        print("=" * 50)
        
        print(f"🎯 Benim Uygulamam: {result['my_app']['title']} (ID: {result['my_app']['app_id']})")
        print(f"📂 Kategori: {result['my_app']['dna_subclass_label']}")
        print(f"📈 Analiz edilen toplam uygulama: {result['analysis_summary']['total_apps_analyzed']}")
        print(f"🏆 Bulunan rakip sayısı: {result['analysis_summary']['competitors_found']}")
        
        if result['competitors']:
            print("\n🎯 BULUNAN RAKİPLER:")
            print("-" * 30)
            for i, comp in enumerate(result['competitors'], 1):
                print(f"{i}. {comp['title']} (ID: {comp['app_id']})")
                print(f"   💡 Neden: {comp['reason']}")
                print()
        
        # Sonuçları JSON dosyasına kaydet
        output_file = f"competitor_analysis_{app_id}_{country}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"💾 Sonuçlar '{output_file}' dosyasına kaydedildi.")

if __name__ == "__main__":
    main()
