import requests
import json
import time
import csv

def extract_keywords_for_category(category_id, category_name, api_key, country="us", language="us", device="iphone"):
    """Belirli bir kategori için tüm keyword'leri çeker"""
    print(f"🔍 {category_name} kategorisi için keyword'ler çekiliyor...")
    
    base_url = "https://public-api.apptweak.com/api/public/store/keywords/suggestions/category.json"
    headers = {
        "accept": "application/json",
        "x-apptweak-key": api_key
    }
    
    all_keywords = []
    offset = 0
    limit = 100
    
    while True:
        params = {
            "categories": category_id,
            "country": country,
            "language": language,
            "device": device,
            "limit": limit,
            "offset": offset
        }
        
        try:
            response = requests.get(base_url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if "result" not in data or not data["result"]:
                break
            
            keywords = data["result"]
            all_keywords.extend(keywords)
            
            print(f"   📥 Offset: {offset}, {len(keywords)} keyword alındı, toplam: {len(all_keywords)}")
            
            if len(keywords) < limit:
                break
            
            offset += limit
            time.sleep(0.5)  # Rate limiting
            
        except Exception as e:
            print(f"   ❌ Hata: {e}")
            break
    
    print(f"✅ {category_name}: {len(all_keywords)} keyword alındı")
    return all_keywords

def extract_all_categories_keywords(api_key, country="us", language="us", device="iphone"):
    """Tüm kategoriler için keyword'leri çeker"""
    
    # App Store kategorileri
    categories = {
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
    
    print("🚀 Tüm kategoriler için keyword çıkarma başlatılıyor...")
    print("=" * 60)
    
    all_keywords = []
    timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
    
    for category_name, category_id in categories.items():
        try:
            category_keywords = extract_keywords_for_category(
                category_id, category_name, api_key, country, language, device
            )
            
            # Keyword'leri işle
            for keyword_data in category_keywords:
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
            
            print(f"✅ {category_name}: {len(category_keywords)} keyword işlendi")
            
        except Exception as e:
            print(f"❌ {category_name}: Hata - {e}")
        
        print("-" * 40)
        time.sleep(1)  # Kategoriler arası bekleme
    
    # Sonuçları kaydet
    if all_keywords:
        # Ana keyword dosyası
        csv_filename = f"all_categories_keywords_{country}_{language}_{device}_{timestamp}.csv"
        with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['category_id', 'category_name', 'keyword', 'search_volume', 
                         'difficulty', 'country', 'language', 'device']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for keyword in all_keywords:
                writer.writerow(keyword)
        
        print(f"💾 Ana keyword dosyası kaydedildi: {csv_filename}")
        
        # Kategori özeti
        summary_filename = f"category_summary_{country}_{language}_{device}_{timestamp}.csv"
        create_category_summary(all_keywords, summary_filename)
        
        print(f"📊 Toplam {len(all_keywords)} keyword {len(categories)} kategoriden çıkarıldı")
        print(f"📁 Sonuç dosyaları: {csv_filename}, {summary_filename}")
    else:
        print("❌ Hiç keyword bulunamadı!")

def create_category_summary(keywords, filename):
    """Kategori bazında özet rapor oluşturur"""
    category_stats = {}
    
    for keyword in keywords:
        category_name = keyword['category_name']
        if category_name not in category_stats:
            category_stats[category_name] = {
                'keyword_count': 0,
                'total_search_volume': 0,
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
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
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
    
    print(f"📊 Kategori özeti kaydedildi: {filename}")
    
    # Özet bilgileri göster
    print("\n📈 KATEGORİ BAZINDA ÖZET:")
    print("-" * 50)
    for category_name, stats in sorted(category_stats.items(), 
                                     key=lambda x: x[1]['keyword_count'], reverse=True):
        print(f"{category_name:25} | {stats['keyword_count']:4} keyword | "
              f"Search Volume: {stats['total_search_volume']:6} | "
              f"Avg Difficulty: {stats['avg_difficulty']:5}")

def extract_single_category_keywords(category_id, category_name, api_key, country="us", language="us", device="iphone"):
    """Tek bir kategori için keyword'leri çeker"""
    print(f"🔍 {category_name} kategorisi için keyword'ler çekiliyor...")
    
    base_url = "https://public-api.apptweak.com/api/public/store/keywords/suggestions/category.json"
    headers = {
        "accept": "application/json",
        "x-apptweak-key": api_key
    }
    
    all_keywords = []
    offset = 0
    limit = 100
    
    while True:
        params = {
            "categories": category_id,
            "country": country,
            "language": language,
            "device": device,
            "limit": limit,
            "offset": offset
        }
        
        try:
            response = requests.get(base_url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if "result" not in data or not data["result"]:
                break
            
            keywords = data["result"]
            all_keywords.extend(keywords)
            
            print(f"   📥 Offset: {offset}, {len(keywords)} keyword alındı, toplam: {len(all_keywords)}")
            
            if len(keywords) < limit:
                break
            
            offset += limit
            time.sleep(0.5)
            
        except Exception as e:
            print(f"   ❌ Hata: {e}")
            break
    
    # Sonuçları kaydet
    if all_keywords:
        timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"{category_name.lower().replace(' ', '_')}_keywords_{country}_{language}_{device}_{timestamp}.csv"
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['keyword', 'search_volume', 'difficulty', 'country', 'language', 'device']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for keyword_data in all_keywords:
                writer.writerow({
                    'keyword': keyword_data.get("keyword", ""),
                    'search_volume': keyword_data.get("search_volume", 0),
                    'difficulty': keyword_data.get("difficulty", 0),
                    'country': country,
                    'language': language,
                    'device': device
                })
        
        print(f"✅ {category_name}: {len(all_keywords)} keyword alındı")
        print(f"💾 Dosya kaydedildi: {filename}")
        return all_keywords
    else:
        print(f"❌ {category_name}: Hiç keyword bulunamadı")
        return []

if __name__ == "__main__":
    # API anahtarı
    API_KEY = "JyjSyfgl7NeQOYdMulFx3nUPN3g"
    
    print("🔑 AppTweak Keyword Çıkarıcı")
    print("=" * 40)
    
    # Hangi işlemi yapmak istediğinizi seçin
    print("1. Tüm kategoriler için keyword'leri çek")
    print("2. Tek kategori için keyword'leri çek")
    print("3. Belirli bir kategori ID'si için keyword'leri çek")
    
    choice = input("Seçiminiz (1/2/3): ").strip()
    
    if choice == "1":
        # Tüm kategoriler
        extract_all_categories_keywords(API_KEY)
        
    elif choice == "2":
        # Tek kategori
        categories = {
            "Books": 6018, "Business": 6000, "Games": 6014, "Education": 6017,
            "Entertainment": 6016, "Finance": 6015, "Health & Fitness": 6013
        }
        
        print("\nMevcut kategoriler:")
        for i, (name, _) in enumerate(categories.items(), 1):
            print(f"{i}. {name}")
        
        cat_choice = input("Kategori seçin (1-7): ").strip()
        try:
            cat_index = int(cat_choice) - 1
            if 0 <= cat_index < len(categories):
                category_name = list(categories.keys())[cat_index]
                category_id = list(categories.values())[cat_index]
                extract_single_category_keywords(category_id, category_name, API_KEY)
            else:
                print("❌ Geçersiz seçim!")
        except ValueError:
            print("❌ Geçersiz sayı!")
            
    elif choice == "3":
        # Özel kategori ID
        category_id = input("Kategori ID'sini girin: ").strip()
        category_name = input("Kategori adını girin: ").strip()
        extract_single_category_keywords(int(category_id), category_name, API_KEY)
        
    else:
        print("❌ Geçersiz seçim!")
