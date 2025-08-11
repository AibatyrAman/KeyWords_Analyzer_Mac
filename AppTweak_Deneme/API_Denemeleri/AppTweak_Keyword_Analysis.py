import requests
import pandas as pd
import time
from typing import Dict, List, Any
import json

class AppTweakKeywordAnalyzer:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "accept": "application/json",
            "x-apptweak-key": api_key
        }
        self.base_url = "https://public-api.apptweak.com/api/public/store"
    
    def get_trending_keywords(self, country: str = "us", device: str = "iphone", 
                             limit: int = 100, start_date: str = "2025-07-29", 
                             end_date: str = "2025-08-06") -> List[Dict]:
        """
        Trending keywords'leri alır
        """
        url = f"{self.base_url}/keywords/suggestions/trending.json"
        params = {
            "country": country,
            "device": device,
            "limit": limit,
            "offset": 0,
            "start_date": start_date,
            "end_date": end_date
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            result = response.json().get("result", {})
            
            keywords_data = []
            for category, keywords in result.items():
                for keyword_info in keywords:
                    keywords_data.append({
                        "keyword": keyword_info.get("keyword", ""),
                        "occurrences": keyword_info.get("occurrences", 0),
                        "volume": keyword_info.get("volume", 0),
                        "difficulty": keyword_info.get("difficulty", 0),
                        "category": category,
                        "country": country
                    })
            
            return keywords_data
        except Exception as e:
            print(f"Trending keywords alınırken hata: {e}")
            return []
    
    def get_keyword_metrics(self, keywords: List[str], country: str = "us", 
                           device: str = "iphone") -> List[Dict]:
        """
        Keyword'ler için detaylı metrikleri alır
        """
        if not keywords:
            return []
        
        # Keywords'leri 5'erli gruplara böl (API limiti)
        keyword_groups = [keywords[i:i+5] for i in range(0, len(keywords), 5)]
        
        all_metrics = []
        
        for keyword_group in keyword_groups:
            keywords_str = ",".join(keyword_group)
            
            url = f"{self.base_url}/keywords/metrics/current.json"
            params = {
                "keywords": keywords_str,
                "metrics": "volume,difficulty,all_installs,results,max_reach",
                "country": country,
                "device": device
            }
            
            try:
                response = requests.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                result = response.json().get("result", {})
                
                for keyword, metrics in result.items():
                    keyword_data = {
                        "keyword": keyword,
                        "volume": metrics.get("volume", {}).get("value", 0),
                        "difficulty": metrics.get("difficulty", {}).get("value", 0),
                        "estimated_installs": metrics.get("all_installs", {}).get("value", 0),
                        "total_results": metrics.get("results", {}).get("value", 0),
                        "max_reach": metrics.get("max_reach", {}).get("value", 0),
                        "country": country
                    }
                    all_metrics.append(keyword_data)
                
                # API rate limit için bekle
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Keyword metrics alınırken hata: {e}")
                continue
        
        return all_metrics
    
    def get_top_apps_for_keywords(self, keywords: List[str], country: str = "us", 
                                 device: str = "iphone", limit: int = 10) -> List[Dict]:
        """
        Her keyword için en iyi performans gösteren app'leri alır
        """
        if not keywords:
            return []
        
        all_top_apps = []
        
        # Keywords'leri tek tek işle (API limiti)
        for keyword in keywords:
            url = f"{self.base_url}/apps/keywords/rankings/current.json"
            params = {
                "keywords": keyword,
                "country": country,
                "device": device
            }
            
            try:
                response = requests.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                result = response.json().get("result", {})
                
                # En iyi performans gösteren app'leri al
                keyword_apps = []
                for app_id, app_data in result.items():
                    for kw, kw_data in app_data.items():
                        if kw == keyword:
                            app_info = {
                                "keyword": keyword,
                                "app_id": app_id,
                                "rank": kw_data.get("rank", {}).get("value", 0),
                                "installs": kw_data.get("installs", {}).get("value", 0),
                                "relevancy": kw_data.get("relevancy", {}).get("value", 0),
                                "country": country
                            }
                            keyword_apps.append(app_info)
                
                # Rank'a göre sırala ve en iyi 10'unu al
                keyword_apps.sort(key=lambda x: x["rank"] if x["rank"] > 0 else float('inf'))
                top_apps = keyword_apps[:limit]
                all_top_apps.extend(top_apps)
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Top apps for keyword '{keyword}' alınırken hata: {e}")
                continue
        
        return all_top_apps
    
    def get_app_metadata_batch(self, app_ids: List[str], country: str = "us", 
                              device: str = "iphone") -> Dict[str, Dict]:
        """
        App ID'ler için metadata alır (App Title, Category)
        """
        if not app_ids:
            return {}
        
        # App ID'leri 5'erli gruplara böl
        app_groups = [app_ids[i:i+5] for i in range(0, len(app_ids), 5)]
        
        app_metadata = {}
        
        for app_group in app_groups:
            apps_str = ",".join(app_group)
            
            url = f"{self.base_url}/apps/metadata/current.json"
            params = {
                "apps": apps_str,
                "country": country,
                "device": device
            }
            
            try:
                response = requests.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                result = response.json().get("result", {})
                
                for app_id, metadata in result.items():
                    app_metadata[app_id] = {
                        "app_title": metadata.get("title", ""),
                        "category": metadata.get("category", ""),
                        "developer": metadata.get("developer", ""),
                        "price": metadata.get("price", ""),
                        "rating": metadata.get("rating", {}).get("value", 0)
                    }
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"App metadata alınırken hata: {e}")
                continue
        
        return app_metadata
    
    def get_app_category_rankings_batch(self, app_ids: List[str], country: str = "us", 
                                       device: str = "iphone") -> Dict[str, Dict]:
        """
        App'lerin kategori ranking'lerini alır
        """
        if not app_ids:
            return {}
        
        # App ID'leri 5'erli gruplara böl
        app_groups = [app_ids[i:i+5] for i in range(0, len(app_ids), 5)]
        
        category_rankings = {}
        
        for app_group in app_groups:
            apps_str = ",".join(app_group)
            
            url = f"{self.base_url}/apps/category-rankings/current.json"
            params = {
                "apps": apps_str,
                "country": country,
                "device": device
            }
            
            try:
                response = requests.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                result = response.json().get("result", {})
                
                for app_id, ranking_data in result.items():
                    category_rankings[app_id] = {
                        "category_rank": ranking_data.get("value", 0),
                        "category": ranking_data.get("category", ""),
                        "country": country
                    }
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"App category ranking alınırken hata: {e}")
                continue
        
        return category_rankings
    
    def get_keyword_live_search(self, keywords: List[str], country: str = "us", 
                               device: str = "iphone") -> List[Dict]:
        """
        Keyword'ler için live search sonuçlarını alır
        """
        if not keywords:
            return []
        
        all_search_results = []
        
        for keyword in keywords:
            url = f"{self.base_url}/keywords/live-search.json"
            params = {
                "keyword": keyword,
                "country": country,
                "device": device,
                "limit": 50  # İlk 50 sonucu al
            }
            
            try:
                response = requests.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                result = response.json().get("result", [])
                
                for app_result in result:
                    search_info = {
                        "keyword": keyword,
                        "app_id": app_result.get("app_id", ""),
                        "app_title": app_result.get("title", ""),
                        "developer": app_result.get("developer", ""),
                        "category": app_result.get("category", ""),
                        "rank": app_result.get("rank", 0),
                        "country": country
                    }
                    all_search_results.append(search_info)
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Live search for keyword '{keyword}' alınırken hata: {e}")
                continue
        
        return all_search_results
    
    def comprehensive_trending_analysis(self, countries: List[str] = None, 
                                     device: str = "iphone", 
                                     keywords_per_country: int = 50,
                                     top_apps_per_keyword: int = 10) -> pd.DataFrame:
        """
        Trending keywords'ten başlayarak kapsamlı analiz yapar
        """
        if countries is None:
            countries = ["us", "gb", "de", "fr", "es", "it", "ca", "au"]
        
        all_data = []
        
        for country in countries:
            print(f"📊 {country.upper()} ülkesi için trending keywords analizi...")
            
            # 1. Trending keywords al
            trending_keywords = self.get_trending_keywords(
                country=country, 
                device=device,
                limit=keywords_per_country
            )
            print(f"   ✅ {len(trending_keywords)} trending keyword bulundu")
            
            if not trending_keywords:
                continue
            
            # 2. Keyword'lerin detaylı metriklerini al
            keywords_list = [kw["keyword"] for kw in trending_keywords]
            keyword_metrics = self.get_keyword_metrics(keywords_list, country=country, device=device)
            print(f"   ✅ {len(keyword_metrics)} keyword metrikleri alındı")
            
            # 3. Her keyword için en iyi app'leri al
            top_apps_data = self.get_top_apps_for_keywords(
                keywords_list, 
                country=country, 
                device=device,
                limit=top_apps_per_keyword
            )
            print(f"   ✅ {len(top_apps_data)} top app verisi alındı")
            
            # 4. Live search sonuçlarını al
            live_search_results = self.get_keyword_live_search(
                keywords_list, 
                country=country, 
                device=device
            )
            print(f"   ✅ {len(live_search_results)} live search sonucu alındı")
            
            # 5. Benzersiz app ID'leri topla
            unique_app_ids = set()
            for app_data in top_apps_data:
                unique_app_ids.add(app_data["app_id"])
            for search_data in live_search_results:
                unique_app_ids.add(search_data["app_id"])
            
            # 6. App metadata al
            app_metadata = self.get_app_metadata_batch(
                list(unique_app_ids), 
                country=country, 
                device=device
            )
            print(f"   ✅ {len(app_metadata)} app metadata alındı")
            
            # 7. App category rankings al
            app_category_rankings = self.get_app_category_rankings_batch(
                list(unique_app_ids), 
                country=country, 
                device=device
            )
            print(f"   ✅ {len(app_category_rankings)} app category ranking alındı")
            
            # 8. Verileri birleştir
            for keyword_metric in keyword_metrics:
                keyword = keyword_metric["keyword"]
                
                # Bu keyword için top app'leri bul
                keyword_top_apps = [app for app in top_apps_data if app["keyword"] == keyword]
                
                # Bu keyword için live search sonuçlarını bul
                keyword_search_results = [result for result in live_search_results if result["keyword"] == keyword]
                
                # Top app'ler için detaylı veri oluştur
                for app_data in keyword_top_apps:
                    app_id = app_data["app_id"]
                    app_info = app_metadata.get(app_id, {})
                    category_ranking = app_category_rankings.get(app_id, {})
                    
                    combined_data = {
                        **keyword_metric,
                        "app_id": app_id,
                        "app_title": app_info.get("app_title", ""),
                        "app_category": app_info.get("category", ""),
                        "developer": app_info.get("developer", ""),
                        "app_rating": app_info.get("rating", 0),
                        "keyword_rank": app_data.get("rank", 0),
                        "keyword_installs": app_data.get("installs", 0),
                        "keyword_relevancy": app_data.get("relevancy", 0),
                        "category_rank": category_ranking.get("category_rank", 0),
                        "category_name": category_ranking.get("category", ""),
                        "data_source": "top_apps"
                    }
                    
                    all_data.append(combined_data)
                
                # Live search sonuçları için de veri oluştur (ilk 5'i)
                for i, search_data in enumerate(keyword_search_results[:5]):
                    app_id = search_data["app_id"]
                    app_info = app_metadata.get(app_id, {})
                    category_ranking = app_category_rankings.get(app_id, {})
                    
                    combined_data = {
                        **keyword_metric,
                        "app_id": app_id,
                        "app_title": search_data.get("app_title", app_info.get("app_title", "")),
                        "app_category": search_data.get("category", app_info.get("category", "")),
                        "developer": search_data.get("developer", app_info.get("developer", "")),
                        "app_rating": app_info.get("rating", 0),
                        "keyword_rank": search_data.get("rank", 0),
                        "keyword_installs": 0,  # Live search'te installs yok
                        "keyword_relevancy": 0,  # Live search'te relevancy yok
                        "category_rank": category_ranking.get("category_rank", 0),
                        "category_name": category_ranking.get("category", ""),
                        "data_source": "live_search"
                    }
                    
                    all_data.append(combined_data)
            
            print(f"   ✅ {country.upper()} için analiz tamamlandı\n")
            time.sleep(1)  # Rate limiting
        
        # DataFrame oluştur
        df = pd.DataFrame(all_data)
        
        if not df.empty:
            # Sütunları düzenle
            column_order = [
                "keyword", "country", "volume", "difficulty", "estimated_installs",
                "total_results", "max_reach", "app_id", "app_title", "app_category",
                "developer", "app_rating", "keyword_rank", "keyword_installs",
                "keyword_relevancy", "category_rank", "category_name", "data_source"
            ]
            
            # Mevcut sütunları filtrele
            existing_columns = [col for col in column_order if col in df.columns]
            df = df[existing_columns]
            
            # Sıralama
            df = df.sort_values(["country", "volume", "keyword_rank"], 
                              ascending=[True, False, True])
        
        return df

def main():
    # API Key'inizi buraya girin
    API_KEY = "JyjSyfgl7NeQOYdMulFx3nUPN3g"
    
    # Analyzer'ı başlat
    analyzer = AppTweakKeywordAnalyzer(API_KEY)
    
    # Ülkeler
    countries = ["us", "gb", "de", "fr", "es", "it", "ca", "au"]
    
    print("🚀 AppTweak Trending Keywords Analizi Başlatılıyor...")
    print("=" * 60)
    print("📋 Bu analiz şunları yapacak:")
    print("   1. Her ülke için trending keywords'leri alacak")
    print("   2. Her keyword için detaylı metrikleri toplayacak")
    print("   3. Her keyword için en iyi performans gösteren app'leri bulacak")
    print("   4. Live search sonuçlarını analiz edecek")
    print("   5. App metadata ve category ranking'leri alacak")
    print("=" * 60)
    
    # Kapsamlı analiz yap
    df = analyzer.comprehensive_trending_analysis(
        countries=countries,
        device="iphone",
        keywords_per_country=50,
        top_apps_per_keyword=10
    )
    
    if not df.empty:
        # Sonuçları kaydet
        filename = f"apptweak_trending_analysis_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv"
        df.to_csv(filename, index=False)
        
        print(f"\n✅ Analiz tamamlandı!")
        print(f"📊 Toplam kayıt: {len(df)}")
        print(f"📁 Dosya kaydedildi: {filename}")
        
        # Özet istatistikler
        print("\n📈 ÖZET İSTATİSTİKLER:")
        print("-" * 40)
        print(f"Ülke sayısı: {df['country'].nunique()}")
        print(f"Benzersiz keyword sayısı: {df['keyword'].nunique()}")
        print(f"App sayısı: {df['app_id'].nunique()}")
        print(f"Ortalama Volume: {df['volume'].mean():.2f}")
        print(f"Ortalama Difficulty: {df['difficulty'].mean():.2f}")
        print(f"Ortalama Estimated Installs: {df['estimated_installs'].mean():.2f}")
        print(f"Ortalama Keyword Rank: {df['keyword_rank'].mean():.2f}")
        print(f"Ortalama Relevancy: {df['keyword_relevancy'].mean():.2f}")
        
        # Data source dağılımı
        print(f"\n📊 VERİ KAYNAĞI DAĞILIMI:")
        print("-" * 40)
        source_counts = df['data_source'].value_counts()
        for source, count in source_counts.items():
            print(f"  {source}: {count} kayıt")
        
        # En popüler keyword'ler
        print("\n🔥 EN POPÜLER KEYWORD'LER:")
        print("-" * 40)
        top_keywords = df.groupby('keyword')['volume'].sum().sort_values(ascending=False).head(10)
        for keyword, volume in top_keywords.items():
            print(f"  {keyword}: {volume:,}")
        
        # En zor keyword'ler
        print("\n💪 EN ZOR KEYWORD'LER:")
        print("-" * 40)
        hard_keywords = df.groupby('keyword')['difficulty'].mean().sort_values(ascending=False).head(10)
        for keyword, difficulty in hard_keywords.items():
            print(f"  {keyword}: {difficulty:.2f}")
        
        # En iyi performans gösteren app'ler
        print("\n🏆 EN İYİ PERFORMANS GÖSTEREN APP'LER:")
        print("-" * 40)
        top_apps = df.groupby('app_title')['keyword_rank'].mean().sort_values().head(10)
        for app_title, avg_rank in top_apps.items():
            print(f"  {app_title}: {avg_rank:.2f} (ortalama rank)")
        
        # Ülke bazında analiz
        print("\n🌍 ÜLKE BAZINDA ANALİZ:")
        print("-" * 40)
        country_stats = df.groupby('country').agg({
            'volume': 'mean',
            'difficulty': 'mean',
            'keyword_rank': 'mean',
            'keyword_relevancy': 'mean'
        }).round(2)
        
        for country, stats in country_stats.iterrows():
            print(f"  {country.upper()}:")
            print(f"    Ortalama Volume: {stats['volume']}")
            print(f"    Ortalama Difficulty: {stats['difficulty']}")
            print(f"    Ortalama Rank: {stats['keyword_rank']}")
            print(f"    Ortalama Relevancy: {stats['keyword_relevancy']}")
            print()
        
    else:
        print("❌ Veri bulunamadı!")

if __name__ == "__main__":
    main() 