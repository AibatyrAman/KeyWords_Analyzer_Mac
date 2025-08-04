import flet as ft
from flet import Colors, Icons, FontWeight, TextAlign, ThemeMode, ScrollMode, KeyboardType
import os
import pandas as pd
from openai import OpenAI
import json
import re
import itertools
from collections import Counter
import logging
import asyncio
from typing import Optional, List, Dict, Any
import tempfile
import base64
import datetime
import io
import subprocess
import platform
import unicodedata

# API anahtarı direkt kod içinde
open_ai_key =
# OpenAI client oluştur
client = OpenAI(api_key=open_ai_key)

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='app.log'
)

class color():
    BLUE = "\033[34m"
    CYAN = "\033[36m"
    MAGENTA = "\033[35m"
    GREEN = "\033[32m"
    RED = "\033[31m"
    YELLOW = "\033[33m"
    RESET = "\033[0m"

# Mevcut Df_Get sınıfını aynı şekilde kopyalayıp paste ediyorum
class Df_Get():
    def merged_noduplicate_df(klasor_yolu):
        """
        Klasördeki tüm .csv dosyalarını birleştirir,
        Keyword, Volume ve Difficulty sütunlarına göre tekrarlı satırları kaldırır,
        tüm sütunları saklayarak bir DataFrame döndürür.
        Title sütunu CSV dosya isimlerinden oluşturulur.
        """
        print("DEBUG: merged_noduplicate_df() başlatıldı. Klasör:", klasor_yolu)
        try:
            csv_dosyalar = [f for f in os.listdir(klasor_yolu) if f.endswith('.csv')]
            print("DEBUG: Bulunan CSV dosyaları:", csv_dosyalar)
            if not csv_dosyalar:
                raise ValueError("Klasörde hiç .csv dosyası bulunamadı!")
            
            dataframes = []
            for dosya in csv_dosyalar:
                df_temp = pd.read_csv(os.path.join(klasor_yolu, dosya))
                print(f"DEBUG: {dosya} okundu, şekli: {df_temp.shape}")
                
                # Growth sütununu integer'a çevir
                if 'Growth (Max Reach)' in df_temp.columns:
                    def convert_growth_to_int(growth_str):
                        if pd.isna(growth_str) or growth_str == '':
                            return 0
                        try:
                            # String'i temizle: "2,333%" -> "2333"
                            cleaned = str(growth_str).replace(',', '').replace('%', '').strip()
                            return int(float(cleaned))
                        except (ValueError, TypeError):
                            return 0
                    
                    df_temp['Growth (Max Reach)'] = df_temp['Growth (Max Reach)'].apply(convert_growth_to_int)
                    print(f"DEBUG: {dosya} için Growth sütunu integer'a çevrildi")
                
                # Dosya adından Category oluştur
                # "trending-keywords-US-Business.csv" -> "Business"
                # "trending-keywords-US-Food & Drink.csv" -> "Food & Drink"
                dosya_adi = dosya.replace('.csv', '')
                parts = dosya_adi.split('-')
                if len(parts) >= 4 and parts[0] == 'trending' and parts[1] == 'keywords':
                    # US kısmından sonraki tüm kısımları birleştir
                    category = '-'.join(parts[3:])  # US kısmından sonrasını al
                else:
                    # Fallback: dosya adının son kısmını al
                    category = dosya_adi.split('-')[-1] if '-' in dosya_adi else dosya_adi
                
                # Category sütununu DataFrame'e ekle
                df_temp['Category'] = category
                print(f"DEBUG: {dosya} için Category: {category}")
                
                dataframes.append(df_temp)

            # Bütün CSV'ler birleştiriliyor
            birlesik_df = pd.concat(dataframes, ignore_index=True)
            
            # Category sütununu en başa taşı
            cols = birlesik_df.columns.tolist()
            if 'Category' in cols:
                cols.remove('Category')
                cols.insert(0, 'Category')
                birlesik_df = birlesik_df[cols]
            
            # Öncelikle, Difficulty sütununa göre azalan sırayla sıralıyoruz
            birlesik_df.sort_values(by="Difficulty", ascending=False, inplace=True)

            # Tekrarlayan keyword'leri kaldırma işlemini kaldırdık
            # Artık tüm keyword'ler görünecek

            print("DEBUG: Birleştirilmiş DataFrame şekli:", birlesik_df.shape)
            print("DEBUG: Sütunlar:", birlesik_df.columns.tolist())
            return birlesik_df

        except Exception as e:
            raise ValueError(f"CSV birleştirme hatası: {e}")
    
    def merged_with_date_df(ana_klasor_yolu):
        """
        Ana klasördeki tüm tarih klasörlerini işler ve her keyword'e tarih bilgisi ekler.
        Örnek: 15-22.07.2025_trending_keywords klasöründeki 20.07.2025_trending_keywords, 21.07.2025_trending_keywords vb.
        """
        print("DEBUG: merged_with_date_df() başlatıldı. Ana klasör:", ana_klasor_yolu)
        print("DEBUG: Ana klasör var mı:", os.path.exists(ana_klasor_yolu))
        print("DEBUG: Ana klasör dizin mi:", os.path.isdir(ana_klasor_yolu))
        
        try:
            # Ana klasördeki tüm alt klasörleri bul
            alt_klasorler = [d for d in os.listdir(ana_klasor_yolu) 
                            if os.path.isdir(os.path.join(ana_klasor_yolu, d))]
            print("DEBUG: Bulunan alt klasörler:", alt_klasorler)
            
            if not alt_klasorler:
                raise ValueError("Ana klasörde hiç alt klasör bulunamadı!")
            
            all_dataframes = []
            
            for alt_klasor in alt_klasorler:
                alt_klasor_yolu = os.path.join(ana_klasor_yolu, alt_klasor)
                
                # Tarih bilgisini alt klasör adından çıkar
                # "20.07.2025_trending_keywords" -> "20.07.2025"
                tarih_bilgisi = alt_klasor.split('_')[0] if '_' in alt_klasor else alt_klasor
                
                print(f"DEBUG: İşlenen alt klasör: {alt_klasor}, Tarih: {tarih_bilgisi}")
                
                # Alt klasördeki CSV dosyalarını bul
                csv_dosyalar = [f for f in os.listdir(alt_klasor_yolu) if f.endswith('.csv')]
                print(f"DEBUG: {alt_klasor} klasöründe {len(csv_dosyalar)} CSV dosyası bulundu")
                
                for dosya in csv_dosyalar:
                    df_temp = pd.read_csv(os.path.join(alt_klasor_yolu, dosya))
                    print(f"DEBUG: {alt_klasor}/{dosya} okundu, şekli: {df_temp.shape}")
                    
                    # Growth sütununu integer'a çevir
                    if 'Growth (Max Reach)' in df_temp.columns:
                        def convert_growth_to_int(growth_str):
                            if pd.isna(growth_str) or growth_str == '':
                                return 0
                            try:
                                cleaned = str(growth_str).replace(',', '').replace('%', '').strip()
                                return int(float(cleaned))
                            except (ValueError, TypeError):
                                return 0
                        
                        df_temp['Growth (Max Reach)'] = df_temp['Growth (Max Reach)'].apply(convert_growth_to_int)
                        print(f"DEBUG: {dosya} için Growth sütunu integer'a çevrildi")
                    
                    # Dosya adından Category oluştur
                    dosya_adi = dosya.replace('.csv', '')
                    parts = dosya_adi.split('-')
                    if len(parts) >= 4 and parts[0] == 'trending' and parts[1] == 'keywords':
                        category = '-'.join(parts[3:])
                    else:
                        category = dosya_adi.split('-')[-1] if '-' in dosya_adi else dosya_adi
                    
                    # Category ve Date sütunlarını ekle
                    df_temp['Category'] = category
                    df_temp['Date'] = tarih_bilgisi
                    print(f"DEBUG: {dosya} için Category: {category}, Date: {tarih_bilgisi}")
                    
                    all_dataframes.append(df_temp)
            
            # Tüm DataFrame'leri birleştir
            birlesik_df = pd.concat(all_dataframes, ignore_index=True)
            
            # Sütun sıralamasını düzenle: Date, Category, diğerleri
            cols = birlesik_df.columns.tolist()
            if 'Date' in cols:
                cols.remove('Date')
                cols.insert(0, 'Date')
            if 'Category' in cols:
                cols.remove('Category')
                cols.insert(1, 'Category')
            birlesik_df = birlesik_df[cols]
            
            # Difficulty'ye göre sırala
            birlesik_df.sort_values(by="Difficulty", ascending=False, inplace=True)
            
            # Tekrarlayan keyword'leri kaldırma işlemini kaldırdık
            # Artık tüm keyword'ler görünecek
            
            print("DEBUG: Tarihli birleştirilmiş DataFrame şekli:", birlesik_df.shape)
            print("DEBUG: Sütunlar:", birlesik_df.columns.tolist())
            return birlesik_df
            
        except Exception as e:
            raise ValueError(f"Tarihli CSV birleştirme hatası: {e}")
    
    def single_csv_df(csv_dosya_yolu):
        """
        Tek bir CSV dosyasını işler ve DataFrame döndürür.
        """
        print("DEBUG: single_csv_df() başlatıldı. CSV dosyası:", csv_dosya_yolu)
        try:
            # CSV dosyasını oku
            df = pd.read_csv(csv_dosya_yolu)
            print(f"DEBUG: CSV okundu, şekli: {df.shape}")
            
            # Growth sütununu integer'a çevir
            if 'Growth (Max Reach)' in df.columns:
                def convert_growth_to_int(growth_str):
                    if pd.isna(growth_str) or growth_str == '':
                        return 0
                    try:
                        cleaned = str(growth_str).replace(',', '').replace('%', '').strip()
                        return int(float(cleaned))
                    except (ValueError, TypeError):
                        return 0
                
                df['Growth (Max Reach)'] = df['Growth (Max Reach)'].apply(convert_growth_to_int)
                print(f"DEBUG: Growth sütunu integer'a çevrildi")
            
            # Dosya adından Category oluştur
            dosya_adi = os.path.basename(csv_dosya_yolu).replace('.csv', '')
            parts = dosya_adi.split('-')
            if len(parts) >= 4 and parts[0] == 'trending' and parts[1] == 'keywords':
                category = '-'.join(parts[3:])
            else:
                category = dosya_adi.split('-')[-1] if '-' in dosya_adi else dosya_adi
            
            # Category sütununu ekle
            df['Category'] = category
            print(f"DEBUG: Category eklendi: {category}")
            
            # Category sütununu en başa taşı
            cols = df.columns.tolist()
            if 'Category' in cols:
                cols.remove('Category')
                cols.insert(0, 'Category')
                df = df[cols]
            
            # Difficulty'ye göre sırala
            df.sort_values(by="Difficulty", ascending=False, inplace=True)
            
            print("DEBUG: Tek CSV DataFrame şekli:", df.shape)
            print("DEBUG: Sütunlar:", df.columns.tolist())
            return df
            
        except Exception as e:
            raise ValueError(f"Tek CSV işleme hatası: {e}")
        
    def kvd_df(df,limit):
        df_filtered = df[(df["Volume"] >= 20) & (df["Difficulty"] <= limit)]
        df_filtered.loc[:, "Volume"] = pd.to_numeric(df_filtered["Volume"], errors="coerce")
        df_filtered = df_filtered.dropna(subset=["Volume"])  
        df_filtered["Volume"] = df_filtered["Volume"].astype(int)
        df_filtered.sort_values(by="Volume", ascending=False, inplace=True)
        
        # Category sütunu varsa koru, yoksa sadece temel sütunları al
        if 'Category' in df_filtered.columns:
            df_result = df_filtered[["Category", "Keyword", "Volume", "Difficulty"]].dropna()
        else:
            df_result = df_filtered[["Keyword", "Volume", "Difficulty"]].dropna()
            
        print("DEBUG: Filtrelenmiş ve sıralanmış KVD CSV:\n", df_result)
        return df_result

    def kelime_frekans_df(df, openai_api_key):
        print("DEBUG: kelime_frekans_df() başlatıldı.")
        kelimeler = " ".join(df["Keyword"].astype(str)).split()
        print("DEBUG: Birleştirilmiş kelimeler:", kelimeler)
        kelime_sayaci = Counter(kelimeler)
        df_kf = pd.DataFrame(kelime_sayaci.items(), columns=["Kelime", "Frekans"]).sort_values(by="Frekans", ascending=False)
        
        # Eğer orijinal df'de Category sütunu varsa, frekans tablosuna da ekle
        if 'Category' in df.columns and not df.empty:
            # En yaygın Category'yi kullan (basit yaklaşım)
            most_common_category = df['Category'].mode().iloc[0] if len(df['Category'].mode()) > 0 else "Frequency"
            df_kf['Category'] = most_common_category
            # Category sütununu en başa taşı
            cols = df_kf.columns.tolist()
            cols.remove('Category')
            cols.insert(0, 'Category')
            df_kf = df_kf[cols]
        
        print("DEBUG: Frekans DataFrame'i:\n", df_kf)
        return df_kf

    def without_branded_kf_df_get(df_kf, openai_api_key):
        """
        Branded kelimeleri ve yasaklı kelimeleri DataFrame'den filtreler.
        """
        try:
            word_list = df_kf['Kelime'].tolist()
            
            yasakli_kelimeler = [
                "free", "new", "best", "top", "iphone", "ipad", "android", "google", "store", 
                "download", "downloads", "for", "apple", "with", "yours", "a", "about", "above", "after", "again", "against", "all", 
                "am", "an", "and", "any", "app", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", 
                "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", 
                "doing", "don't", "down", "during", "each", "few", "from", "further", "had", "hadn't", "has", "hasn't", "have", 
                "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", 
                "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", 
                "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", 
                "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", 
                "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", 
                "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", 
                "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", 
                "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", 
                "whom", "why", "why's", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", 
                "yourself", "yourselves"]
            
            system_prompt = """
You are an expert in identifying branded words and proper nouns. Your task is to determine if the given words are branded words or proper nouns (like "Williams", "Sherwin", etc.).
You need to identify and return only the words that are branded or proper nouns from the provided list.

Here is the task in detail:
1. Review the following list of words.
2. Identify the branded words and proper nouns.
3. Return the list of identified branded words and proper nouns in the following format:

Example:
- Input: ["Apple", "car", "Sherwin", "painting"]
- Output: ["Apple", "Sherwin"]

*Important*: 
- Only include the branded words and proper nouns in the returned list, and avoid any other words."""
            
            user_prompt = f"""
            Here is the list of words:
            {word_list}

            Return the list of branded words and proper nouns in the following format:
            ["word1", "word2", "word3"]
            """
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0,
                max_tokens=150
            )
            
            answer = response.choices[0].message.content.strip()
            print(f'{color.RED}DEBUG:BRANDED API yanıtı:{color.RESET} {answer}')
            
            try:
                branded_data = json.loads(answer)
                print("DEBUG: JSON başarıyla ayrıştırıldı:", branded_data)
                branded_words = [str(item).lower() for item in branded_data] if isinstance(branded_data, list) else []
            except json.JSONDecodeError:
                print("DEBUG: JSON ayrıştırma hatası, manuel işleme yapılıyor")
                cleaned = answer.replace("[", "").replace("]", "").replace('"', '').strip()
                branded_words = [w.strip().lower() for w in cleaned.split(",") if w.strip()]
                print("DEBUG: Manuel temizlenmiş veri:", branded_words)

            # Kelime filtresi oluştur ve mask ile filtreleme yap
            mask = ~(df_kf['Kelime'].str.lower().isin(branded_words) | 
                    df_kf['Kelime'].str.lower().isin(yasakli_kelimeler))
            
            # Filtrelenmiş DataFrame'i oluştur
            filtered_df = df_kf[mask].copy()
            
            # Category sütunu varsa koru
            if 'Category' in df_kf.columns:
                # Category sütununu en başta tut
                cols = filtered_df.columns.tolist()
                if 'Category' in cols and cols[0] != 'Category':
                    cols.remove('Category')
                    cols.insert(0, 'Category')
                    filtered_df = filtered_df[cols]
            
            print(f"DEBUG: Filtrelenmiş kelime sayısı: {len(filtered_df)}")
            return filtered_df
            
        except Exception as e:
            print(f"HATA: {str(e)}")
            return pd.DataFrame(columns=['Kelime', 'Frekans'])

    def aggregate_frequencies(df):
        """
        Aynı kelimeleri birleştirerek frekans değerlerini toplar.
        Title sütunu varsa korur.
        """
        try:
            if df is None or df.empty:
                print("\033[31mHATA: Boş veya geçersiz DataFrame\033[0m")
                return pd.DataFrame(columns=['Kelime', 'Frekans'])

            # Category sütunu varsa koru
            if 'Category' in df.columns:
                # Önce Category'yi al
                category_value = df['Category'].iloc[0] if not df.empty else "Aggregated"
                # Kelime bazında grupla
                aggregated_df = df.groupby("Kelime", as_index=False)["Frekans"].sum()
                # Category'yi geri ekle
                aggregated_df['Category'] = category_value
                # Category'yi en başa taşı
                cols = ['Category', 'Kelime', 'Frekans']
                aggregated_df = aggregated_df[cols]
            else:
                aggregated_df = df.groupby("Kelime", as_index=False)["Frekans"].sum()
            
            print("\033[32mDEBUG: Frekanslar birleştirildi.\033[0m")
            return aggregated_df
        
        except Exception as e:
            print(f"\033[31mHATA: Genel hata: {str(e)}\033[0m")
            return pd.DataFrame(columns=['Kelime', 'Frekans'])
        
    def without_suffixes_df_get(kf_df, selected_country,openai_api_key):
        """
        Kelimelerin çoğul eklerini kaldırır ve tekil formlarını döndürür.
        """
        try:
            if kf_df is None or kf_df.empty:
                print("\033[31mHATA: Boş veya geçersiz DataFrame\033[0m")
                return pd.DataFrame(columns=['Kelime', 'Frekans'])
            
            keyword_list = kf_df['Kelime'].dropna().tolist()
            if not keyword_list:
                print("\033[33mUYARI: Kelime listesi boş\033[0m")
                return pd.DataFrame(columns=['Kelime', 'Frekans'])

            print(f"{color.CYAN}DEBUG: SUFFİXES COUNTRY:{selected_country}{color.RESET}")
            
            system_prompt = f"""
You are an expert in language processing. Your task is:
1. Given a Python list of keywords in the language relevant to the market of {selected_country},
2. Remove only the plural suffixes from each word to return the singular/base form. For example, if the keywords are in English (as in the {selected_country} market when applicable), remove plural suffixes such as -s, -es, and -ies. If the keywords are in another language, apply the appropriate plural suffix removal rules according to the language conventions of {selected_country}.
3. If a word does not end with any of these plural suffixes, leave it unchanged.
4. Provide the final answer strictly as a Python list of strings.

Example:
- Input: ["cats", "boxes", "stories", "apple"]
- Output: ["cat", "box", "story", "apple"]

**WARNING**: Only remove plural suffixes. Do not remove any other suffix or modify the word in any other way.
"""

            user_prompt = f"""
            Here is the list of words:
            {keyword_list}

            Return the processed list in JSON list format. For example:
            ["word1","word2","word3"]
            """

            try:
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0,
                    timeout=60
                )

                answer = response.choices[0].message.content.strip()
                print(f"\033[34mDEBUG: Suffixes API yanıtı: {answer}\033[0m")

                # Yanıtın başında ve sonunda üçlü tırnak içeren kod bloğu olup olmadığını kontrol et ve temizle
                if answer.startswith("```json") or answer.startswith("```python"):
                    answer = answer.split("```")[1]
                    answer = answer.replace("json", "").replace("python", "").strip()
                    answer = answer.split("```")[0]

                try:
                    base_form_list = json.loads(answer)

                    if not isinstance(base_form_list, list) or not base_form_list:
                        raise ValueError("API yanıtı geçerli bir liste değil veya boş.")

                    if len(base_form_list) != len(keyword_list):
                        print(f"\033[33mUYARI: API yanıt uzunluğu ({len(base_form_list)}) keyword listesi uzunluğu ({len(keyword_list)}) ile eşleşmiyor. Orijinal liste kullanılacak.\033[0m")
                        base_form_list = keyword_list

                    kf_df['Frekans'] = kf_df['Frekans'].fillna(0)

                    result_df = pd.DataFrame({
                        'Kelime': base_form_list,
                        'Frekans': kf_df['Frekans']
                    })
                    
                    # Category sütunu varsa koru
                    if 'Category' in kf_df.columns:
                        category_value = kf_df['Category'].iloc[0] if not kf_df.empty else "Suffixes"
                        result_df['Category'] = category_value
                    
                    result_df = Df_Get.aggregate_frequencies(result_df)
                    result_df = result_df.sort_values(by='Frekans', ascending=False)

                    print(f"\033[32mDEBUG: İşlenmiş kelime sayısı: {len(result_df)}\033[0m")
                    return pd.DataFrame(result_df)

                except json.JSONDecodeError as e:
                    print(f"\033[31mHATA: JSON ayrıştırma hatası: {str(e)}\033[0m")
                    return kf_df

            except Exception as e:
                print(f"\033[31mHATA: API çağrısı veya işleme hatası: {str(e)}\033[0m")
                return kf_df

        except Exception as e:
            print(f"\033[31mHATA: Genel hata: {str(e)}\033[0m")
            return pd.DataFrame(columns=['Kelime', 'Frekans'])

    def gpt_Title_Subtitle_df_get(df, app_name, selected_country, openai_api_key, retry_count=0, max_retries=3):
        print(f"DEBUG: gpt_Title_Subtitle_df() başlatıldı. retry_count={retry_count}")
        print(f"{color.YELLOW}gpt_Title_Subtitle_df_get için kullanılan df:\n{df}{color.RESET}")
        df_sorted = df.sort_values(by='Frekans', ascending=False)
        top_keywords = df_sorted['Kelime'].tolist()
        print("DEBUG: En sık kullanılan kelimeler:", top_keywords)
        
        prompt_system = f'''
You are an experienced ASO (App Store Optimization) expert. Your task is to generate optimized Title and Subtitle for an app based on the provided keyword data, taking into account the market characteristics of the selected country: **{selected_country}**.

I will provide you with a list of keywords sorted by frequency. Based on this information, your task is to generate the most optimized Title and Subtitle for an app's App Store page for the {selected_country} market. Here are the detailed rules:

1. **Title**:
- Must include the app name: **{app_name}**
- The title must be no longer than **30 characters** and no shorter than **25 characters**.
- Use the most frequent keywords first, prioritizing those at the beginning of the provided list.
- Ensure that the titles are unique and not repetitive; each generated title should use a different combination of keywords.
- **Do not include any of the following words like: "and", "or", "your", "my", "with", etc.**

2. **Subtitle**:
- It must not exceed **30 characters** and no shorter than **25 characters**.
- Do not repeat any keywords used in the Title.
- Use the most frequent keywords first, prioritizing those at the beginning of the provided list.
- Ensure that the subtitles are unique and distinct from each other.
- **Do not include any of the following words like: "and", "or", "your", "my", "with".**

3. **Important**:
- Focus on using keywords from the beginning of the provided list, where the frequency values are higher.
- Make sure the Title and Subtitle align with these rules to maximize the app's visibility and effectiveness in the App Store.
- **Do not include any of the following words like: "and", "or", "your", "my", "with".**
- *Only generate 5 title and 5 subtitle*
'''
        
        prompt_user = f'''
Here are the most frequent keywords:
{','.join(top_keywords)}
- **The title and subtitle must be no longer than 30 characters and no shorter than 25 characters.**
- **Do not include any of the following words like: "and", "or", "your", "my", "with".**
- *Only generate 5 title and 5 subtitle*

**Provide the output strictly in the following JSON format:**
json
{{
"data": [
    {{"Title": "Generated Title", "Subtitle": "Generated Subtitle"}},
    {{"Title": "Generated Title", "Subtitle": "Generated Subtitle"}},
    {{"Title": "Generated Title", "Subtitle": "Generated Subtitle"}},
    {{"Title": "Generated Title", "Subtitle": "Generated Subtitle"}},
    {{"Title": "Generated Title", "Subtitle": "Generated Subtitle"}}
]
}}
'''
        
        print('\033[31m\033[44mDEBUG: OpenAI isteği hazırlanıyor\033[0m')
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": prompt_system},
                    {"role": "user", "content": prompt_user}
                ],
                temperature=0.7,
                max_tokens=539,
            )
            text_output = response.choices[0].message.content
            
            def parse_openai_json(text_output):
                match = re.search(r'```json\s*(\{.*?\})\s*```', text_output, re.DOTALL)
                
                if match:
                    json_text = match.group(1)
                    print("DEBUG: JSON formatı bulundu.")
                else:
                    json_text = text_output
                    print("DEBUG: Tüm metin JSON olarak kullanılacak.")
                
                json_text = json_text.strip()
                json_text = json_text.replace(""", "\"").replace(""", "\"")
                json_text = json_text.encode("utf-8", "ignore").decode("utf-8", "ignore")

                output_data = json.loads(json_text)
                return output_data

            try:
                parsed = parse_openai_json(text_output)
                print(parsed)
            except json.JSONDecodeError as e:
                print("JSON hatası yakalandı:", e)

            title_stitle_df = pd.DataFrame(parse_openai_json(text_output)["data"], columns=["Title", "Subtitle"])
            print("DEBUG: API yanıtından oluşturulan DataFrame:\n", title_stitle_df)

            unused_keywords_list = []  
            title_len_list = []
            subtitle_len_list = []
            toplam_keywords_lenght_list = []

            for index, row in title_stitle_df.iterrows():
                top_keywords_for_for = set()
                top_keywords_for_for = top_keywords
                title_words = set(row["Title"].split())  
                subtitle_words = set(row["Subtitle"].split())  

                title_len_list.append(len(row["Title"]))
                subtitle_len_list.append(len(row["Subtitle"]))

                used_keywords = title_words.union(subtitle_words)
                used_keywords = set(item.lower() for item in used_keywords)
                print("\033[32mDEBUG: Used_Keyword Çıktısı: \033[0m", used_keywords)

                unused_keywords = [kw for kw in top_keywords_for_for if kw.lower() not in used_keywords]
                print("\033[33mUnused_Keyword:\033[0m", unused_keywords)

                result_str = ""
                for keyword in unused_keywords:
                    candidate = keyword if result_str == "" else result_str + "," + keyword
                    try:
                        if len(candidate) <= 100:
                            result_str = candidate
                        else:
                            toplam_keywords_lenght_list.append(len(result_str))
                            break
                    except ValueError as e:
                        if "Length of values" in str(e) and "does not match length of index" in str(e):
                            print("DEBUG: unused_keywords_list uzunluğu DataFrame indeks uzunluğu ile uyuşmuyor!")
                            toplam_keywords_lenght_list.append(len(result_str))
                        else:
                            raise

                print("\033[34mresult_str:\n\033[0m", result_str)
                unused_keywords_list.append(result_str)

            title_stitle_df["Keywords"] = unused_keywords_list
            title_stitle_df["Keywords_Lenght"] = toplam_keywords_lenght_list
            title_stitle_df["Title_Lenght"] = title_len_list
            title_stitle_df["Subtitle_Lenght"] = subtitle_len_list

            print("DEBUG: Son DataFrame (gpt_Title_Subtitle_df()):\n", title_stitle_df)
            return title_stitle_df

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            print("DEBUG: gpt_Title_Subtitle_df() hatası:", e)
            return pd.DataFrame(columns=["Title", "Subtitle"])
        
    def find_matching_keywords(title_subtitle_df, merged_df):
        print(f"\033[34mDEBUG: find_matching_keywords() başladı.\033[0m")
        results = []
        matched_keywords_result = []

        for gpt_idx, gpt_row in title_subtitle_df.iterrows():
            title_words = set(str(gpt_row['Title']).lower().split()) if pd.notna(gpt_row['Title']) else set()
            subtitle_words = set(str(gpt_row['Subtitle']).lower().split()) if pd.notna(gpt_row['Subtitle']) else set()
            additional_words = set(str(gpt_row['Keywords']).lower().split(',')) if 'Keywords' in gpt_row and pd.notna(gpt_row['Keywords']) else set()

            combined_words = title_words.union(subtitle_words).union(additional_words)
            print(f"\033[35mDEBUG: İşlenen Title_Subtitle satırı {gpt_idx}, Kelimeler: {combined_words}\033[0m")

            matched_keywords = []
            total_volume = 0
            total_difficulty = 0
            ort_volume = 0
            ort_difficulty = 0
            counter = 0

            for _, merged_row in merged_df.iterrows():
                keyword_value = merged_row.get('Keyword')

                if pd.isna(keyword_value) or not isinstance(keyword_value, str):
                    continue
                
                keyword_words = set(keyword_value.lower().split())

                if keyword_words.issubset(combined_words):
                    matched_keywords.append(keyword_value)
                    total_volume += merged_row['Volume']
                    total_difficulty += merged_row['Difficulty']
                    counter += 1
                    ort_difficulty = round(total_difficulty / counter, 3)
                    ort_volume = round(total_volume / counter, 3)
                    matched_keywords_result.append({
                        'Matched Keywords': merged_row['Keyword'],
                        'Volume': merged_row['Volume'],
                        'Difficulty': merged_row['Difficulty']
                    })

                    print(f"\033[32mDEBUG: Eşleşme! '{keyword_value}' (Vol: {merged_row['Volume']}, Diff: {merged_row['Difficulty']})\033[0m")
            
            results.append({
                'Title': gpt_row['Title'],
                'Subtitle': gpt_row['Subtitle'],
                'Keywords': gpt_row['Keywords'],
                'Title Lenght': gpt_row['Title_Lenght'],
                'Subtitle Lenght': gpt_row['Subtitle_Lenght'],
                'Keywords Lenght': gpt_row['Keywords_Lenght'],
                'Total Volume': total_volume,
                'Total Difficulty': total_difficulty,
                'Avarage Volume': ort_volume,
                'Avarage Difficulty': ort_difficulty,
                'Renklenen Keywords Sayısı': counter
            })

        print(f"\033[34mDEBUG: find_matching_keywords() tamamlandı.\033[0m")
        return pd.DataFrame(results), pd.DataFrame(matched_keywords_result)

# Flet ASO App
class ASOApp:
    def __init__(self, page: ft.Page):
        self.page = page
        self.page.title = "ASO Generate Tool - Professional Edition"
        self.page.theme_mode = ThemeMode.LIGHT
        self.page.window_width = 1600
        self.page.window_height = 900
        self.page.window_min_width = 800  # Daha küçük cihazlar için
        self.page.window_min_height = 600  # Daha küçük cihazlar için
        self.page.window_resizable = True
        self.page.window_maximizable = True
        self.page.padding = 20
        
        # Veri storage
        self.folder_path = ""
        self.column_filters = {}  # Her sütun için filtre değerleri
        self.keyword_search_term = ""
        self.search_terms_list = []  # Çoklu arama terimleri listesi
        self.exclude_terms_list = []  # Çıkarılacak kelimeler listesi
        self.filter_non_latin = False  # Latin harici alfabeleri filtrele
        self.selected_country = "United States"
        self.app_name = ""
        self.open_ai_key = open_ai_key
        self.date_mode = False  # Tarih modu (çoklu klasör işleme)
        self.file_mode = False  # Dosya modu (tek CSV dosyası işleme)
        
        # DataFrame'ler
        self.merged_noduplicate_df = None
        self.current_table = None
        
        # Sıralama durumu
        self.sort_column_index = 0
        self.sort_ascending = True
        
        self.setup_ui()
        
    def setup_ui(self):
        # Ana container
        main_container = ft.Container(
            content=ft.Column([
                # Header
                ft.Container(
                    content=ft.Row([
                        ft.Icon(Icons.ANALYTICS, size=30, color=Colors.BLUE_700),
                        ft.Text(
                            "ASO Generate Tool",
                            size=28,
                            weight=FontWeight.BOLD,
                            color=Colors.BLUE_700
                        ),
                        ft.Text(
                            "Professional Edition",
                            size=16,
                            color=Colors.GREY_600,
                            style=ft.TextThemeStyle.BODY_MEDIUM
                        )
                    ]),
                    bgcolor=Colors.BLUE_50,
                    padding=20,
                    border_radius=10,
                    margin=ft.margin.only(bottom=20)
                ),
                
                        # Main content - Responsive Layout
        ft.Container(
            content=ft.Row([
                # Left Panel - Controls (25% genişlik) with scroll
                ft.Container(
                    content=ft.Column([
                        self.create_left_panel()
                    ], scroll=ScrollMode.AUTO),
                    bgcolor=Colors.WHITE,
                    border_radius=10,
                    padding=15,
                    expand=2,  # 25% ekran genişliği
                    height=800,  # Sabit yükseklik
                    shadow=ft.BoxShadow(
                        spread_radius=1,
                        blur_radius=10,
                        color=Colors.with_opacity(0.1, Colors.GREY_400)
                    )
                ),
                
                # Spacing
                ft.Container(width=15),
                
                # Right Panel - Table (75% genişlik)
                ft.Container(
                    content=self.create_right_panel(),
                    bgcolor=Colors.WHITE,
                    border_radius=10,
                    padding=15,
                    expand=8,  # 75% ekran genişliği
                    shadow=ft.BoxShadow(
                        spread_radius=1,
                        blur_radius=10,
                        color=Colors.with_opacity(0.1, Colors.GREY_400)
                    )
                )
            ], 
            alignment=ft.MainAxisAlignment.START,
            expand=True)
        )
            ], expand=True),
            expand=True
        )
        
        self.page.add(main_container)
        
    def create_left_panel(self):
        # File picker
        self.folder_picker = ft.FilePicker(on_result=self.on_folder_selected)
        self.page.overlay.append(self.folder_picker)
        
        # Folder/File selection area - Responsive
        self.folder_display = ft.Container(
            content=ft.Column([
                ft.Icon(Icons.FOLDER_OPEN, size=30, color=Colors.BLUE_400),
                ft.Text(
                    "CSV Klasörü/Dosyası Seç",
                    size=14,
                    text_align=ft.TextAlign.CENTER,
                    color=Colors.BLUE_600
                ),
                ft.Text(
                    "Klasör veya dosya seçmek için tıklayın",
                    size=10,
                    text_align=ft.TextAlign.CENTER,
                    color=Colors.GREY_600
                )
            ], alignment=ft.MainAxisAlignment.CENTER),
            height=90,
            bgcolor=Colors.BLUE_50,
            border=ft.border.all(2, Colors.BLUE_200),
            border_radius=10,
            padding=15,
            alignment=ft.alignment.center,
            expand=True,  # Responsive genişlik
            on_click=self.open_native_folder_picker
        )
        

        

        

        
        # Dinamik sütun filtreleri için container
        self.column_filters_container = ft.Column(
            controls=[],
            spacing=10,
            scroll=ScrollMode.AUTO,
            height=200  # Daha fazla alan
        )
        
        # Keyword search filter
        self.keyword_search_input = ft.TextField(
            label="Keyword Arama",
            hint_text="Örn: ai, photo, music",
            value="",
            on_submit=self.add_search_term,  # Enter tuşuna basınca da ekle
            expand=True
        )
        
        # Add search term button
        self.add_search_button = ft.ElevatedButton(
            "Ekle",
            on_click=self.add_search_term,
            style=ft.ButtonStyle(
                color=Colors.WHITE,
                bgcolor=Colors.BLUE_500,
                elevation=2,
                shape=ft.RoundedRectangleBorder(radius=8)
            ),
            height=40,
            width=80
        )
        
        # Exclude search term button
        self.exclude_search_button = ft.ElevatedButton(
            "Çıkar",
            on_click=self.add_exclude_term,
            style=ft.ButtonStyle(
                color=Colors.WHITE,
                bgcolor=Colors.RED_500,
                elevation=2,
                shape=ft.RoundedRectangleBorder(radius=8)
            ),
            height=40,
            width=80
        )
        
        # Search terms container - dynamic chips
        self.search_terms_container = ft.Row(
            controls=[],
            spacing=5,
            wrap=True,
            alignment=ft.MainAxisAlignment.START
        )
        
        # Non-Latin filter checkbox
        self.non_latin_checkbox = ft.Checkbox(
            label="Latin Harici Alfabeleri Çıkar",
            value=False,
            on_change=self.on_non_latin_filter_changed,
            label_style=ft.TextStyle(size=12, color=Colors.BLUE_700)
        )
        

        
        # Apply filters button
        self.apply_filters_button = ft.ElevatedButton(
            "🔍 Filtreleri Uygula",
            on_click=self.apply_filters,
            style=ft.ButtonStyle(
                color=Colors.WHITE,
                bgcolor=Colors.GREEN_600,
                elevation=2,
                shape=ft.RoundedRectangleBorder(radius=8)
            ),
            height=45,
            expand=True
        )
        
        # Buttons
        button_style = ft.ButtonStyle(
            color=Colors.WHITE,
            bgcolor=Colors.BLUE_600,
            elevation=2,
            shape=ft.RoundedRectangleBorder(radius=8)
        )
        
        # Responsive Buttons
        buttons = [
            ft.ElevatedButton(
                "Birleştirilmiş Ana Tablo (Filtreli)",
                on_click=self.show_merged_table,
                style=button_style,
                height=45,
                expand=True  # Responsive genişlik
            ),
            ft.ElevatedButton(
                "Birleştirilmiş Ana Tablo (Tümü)",
                on_click=self.show_merged_table_all,
                style=button_style,
                height=45,
                expand=True  # Responsive genişlik
            )
        ]
        
        # Tarih modu toggle
        self.date_mode_switch = ft.Switch(
            label="📅 Tarih Modu (Çoklu Klasör)",
            value=False,
            on_change=self.on_date_mode_changed,
            label_style=ft.TextStyle(size=12, color=Colors.PURPLE_700, weight=FontWeight.BOLD)
        )
        
        # Dosya modu toggle
        self.file_mode_switch = ft.Switch(
            label="📄 Dosya Modu (Tek CSV)",
            value=False,
            on_change=self.on_file_mode_changed,
            label_style=ft.TextStyle(size=12, color=Colors.ORANGE_700, weight=FontWeight.BOLD)
        )
        
        return ft.Column([
            self.folder_display,
            ft.Divider(height=20),
            ft.ElevatedButton(
                "Yükle",
                on_click=self.load_data,
                style=ft.ButtonStyle(
                    color=Colors.WHITE,
                    bgcolor=Colors.GREEN_600,
                    elevation=2,
                    shape=ft.RoundedRectangleBorder(radius=8)
                ),
                height=45,
                expand=True  # Responsive genişlik
            ),
            ft.Divider(height=10),
            ft.Container(
                content=self.date_mode_switch,
                padding=10,
                bgcolor=Colors.PURPLE_50,
                border_radius=8,
                border=ft.border.all(1, Colors.PURPLE_200)
            ),
            ft.Divider(height=10),
            ft.Container(
                content=self.file_mode_switch,
                padding=10,
                bgcolor=Colors.ORANGE_50,
                border_radius=8,
                border=ft.border.all(1, Colors.ORANGE_200)
            ),
            ft.Divider(height=20),
            # Filtre ayarları için ExpansionTile
            ft.ExpansionTile(
                title=ft.Text(
                    "🔍 Filtre Ayarları",
                    size=16,
                    weight=FontWeight.BOLD,
                    color=Colors.BLUE_700
                ),
                subtitle=ft.Text(
                    "Sütun filtreleri, arama terimleri ve diğer filtreler",
                    size=12,
                    color=Colors.GREY_600
                ),
                bgcolor=Colors.BLUE_50,
                collapsed_bgcolor=Colors.BLUE_50,
                initially_expanded=False,
                maintain_state=True,
                controls=[
                    # Scroll edilebilir filtre içeriği
                    ft.Container(
                        content=ft.Column([
                            # Dinamik Sütun Filtreleri
                            ft.Container(
                                content=ft.Column([
                                    ft.Text(
                                        "📊 Sütun Filtreleri",
                                        size=14,
                                        weight=FontWeight.BOLD,
                                        color=Colors.BLUE_700
                                    ),
                                    ft.Text(
                                        "Veriler yüklendikten sonra sütun filtreleri burada görünecek",
                                        size=11,
                                        color=Colors.GREY_600,
                                        italic=True
                                    ),
                                    self.column_filters_container
                                ], spacing=10),
                                padding=15,
                                bgcolor=Colors.WHITE,
                                border_radius=8,
                                margin=ft.margin.only(bottom=10)
                            ),
                            
                            # Keyword Arama Bölümü
                            ft.Container(
                                content=ft.Column([
                                    ft.Text(
                                        "🔍 Keyword Arama",
                                        size=14,
                                        weight=FontWeight.BOLD,
                                        color=Colors.GREEN_700
                                    ),
                                    ft.Row([
                                        self.keyword_search_input,
                                        ft.Container(width=5),
                                        self.add_search_button,
                                        ft.Container(width=5),
                                        self.exclude_search_button
                                    ]),
                                    ft.Divider(height=5),
                                    ft.Text(
                                        "🏷️ Arama Terimleri:",
                                        size=12,
                                        color=Colors.GREEN_600,
                                        weight=FontWeight.BOLD
                                    ),
                                    self.search_terms_container
                                ], spacing=10),
                                padding=15,
                                bgcolor=Colors.GREEN_50,
                                border_radius=8,
                                margin=ft.margin.only(bottom=10)
                            ),
                            
                            # Diğer Filtreler
                            ft.Container(
                                content=ft.Column([
                                    ft.Text(
                                        "⚙️ Diğer Filtreler",
                                        size=14,
                                        weight=FontWeight.BOLD,
                                        color=Colors.ORANGE_700
                                    ),
                                    self.non_latin_checkbox,
                                    ft.Divider(height=10),
                                    self.apply_filters_button
                                ], spacing=10),
                                padding=15,
                                bgcolor=Colors.ORANGE_50,
                                border_radius=8,
                                margin=ft.margin.only(bottom=10)
                            )
                        ], scroll=ScrollMode.AUTO),
                        height=400,  # Sabit yükseklik
                        padding=10
                    )
                ]
            ),
            ft.Divider(height=20),
            # Butonlar için ayrı scroll container
            ft.Container(
                content=ft.Column([
                    *buttons,
                    ft.Container(height=20)  # Bottom padding
                ], spacing=10, scroll=ScrollMode.ALWAYS),  # Scroll aktif
                height=300,  # Sabit yükseklik
                border=ft.border.all(1, Colors.GREY_200),
                border_radius=8,
                padding=10,
                bgcolor=Colors.GREY_50
            )
        ], spacing=10, expand=True)
    
    def create_right_panel(self):
        # Table title
        self.table_title = ft.Text(
            "Tablo",
            size=20,
            weight=FontWeight.BOLD,
            color=Colors.BLUE_700
        )
        
        # Data table - Responsive
        self.data_table = ft.DataTable(
            columns=[
                ft.DataColumn(ft.Text("Tablo", weight=FontWeight.BOLD))
            ],
            rows=[
                ft.DataRow(cells=[ft.DataCell(ft.Text("Veri yüklendikten sonra tablolar burada görünecek"))])
            ],
            border=ft.border.all(1, Colors.GREY_300),
            border_radius=10,
            vertical_lines=ft.border.BorderSide(1, Colors.GREY_300),
            horizontal_lines=ft.border.BorderSide(1, Colors.GREY_300),
            heading_row_color=Colors.BLUE_50,
            heading_row_height=50,
            column_spacing=15,  # Daha küçük spacing
            show_checkbox_column=False,
            divider_thickness=1,
            sort_column_index=self.sort_column_index,
            sort_ascending=self.sort_ascending,
            expand=True  # Responsive genişlik
        )
        
        # Table container - Responsive with horizontal and vertical scrolling
        table_container = ft.Container(
            content=ft.Row([
                ft.Column([
                    self.data_table
                ], scroll=ScrollMode.AUTO, expand=True),
            ], scroll=ScrollMode.AUTO, expand=True),
            height=500,  # Yükseklik artırıldı
            border=ft.border.all(1, Colors.GREY_300),
            border_radius=10,
            padding=10,
            expand=True  # Responsive genişlik
        )
        
        # Dosya adı girişi
        self.filename_input = ft.TextField(
            label="Dosya Adı (isteğe bağlı)",
            hint_text="aso_table",
            value="",
            expand=True,
            height=45
        )
        
        # Export button - Responsive
        self.export_button = ft.ElevatedButton(
            "📥 Excel İndir",
            on_click=self.export_table,
            style=ft.ButtonStyle(
                color=Colors.WHITE,
                bgcolor=Colors.ORANGE_600,
                elevation=2,
                shape=ft.RoundedRectangleBorder(radius=8)
            ),
            height=45,
            width=150
        )
        
        return ft.Column([
            self.table_title,
            ft.Divider(height=10),
            table_container,
            ft.Divider(height=10),
            # Export bölümü - Daha üstte
            ft.Container(
                content=ft.Column([
                    ft.Text(
                        "📁 Dosya İndirme",
                        size=14,
                        weight=FontWeight.BOLD,
                        color=Colors.BLUE_700
                    ),
                    ft.Row([
                        self.filename_input,
                        ft.Container(width=10),
                        self.export_button
                    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN)
                ], spacing=5),
                bgcolor=Colors.ORANGE_50,
                border=ft.border.all(1, Colors.ORANGE_200),
                border_radius=8,
                padding=15,
                margin=ft.margin.only(bottom=10)
            )
        ], spacing=5, expand=True)
    
    # Event handlers
    def on_folder_selected(self, e: ft.FilePickerResultEvent):
        if e.path:
            self.folder_path = e.path
            self.folder_display.content = ft.Column([
                ft.Icon(Icons.FOLDER, size=40, color=Colors.GREEN_600),
                ft.Text(
                    "Klasör Seçildi",
                    size=16,
                    text_align=ft.TextAlign.CENTER,
                    color=Colors.GREEN_600
                ),
                ft.Text(
                    os.path.basename(e.path),
                    size=12,
                    text_align=ft.TextAlign.CENTER,
                    color=Colors.GREY_600
                )
            ], alignment=ft.MainAxisAlignment.CENTER)
            self.folder_display.bgcolor = Colors.GREEN_50
            self.folder_display.border = ft.border.all(2, Colors.GREEN_200)
            self.page.update()
    

    
    def open_native_folder_picker(self, e):
        """Klasör veya dosya seçici dialogunu açar - Tüm platformlar için Flet kullanır"""
        print(f"DEBUG: open_native_folder_picker() çağrıldı. Date mode: {self.date_mode}, File mode: {self.file_mode}")
        try:
            if platform.system() == "Darwin":  # macOS
                if self.file_mode:
                    # Dosya modu: CSV dosyası seç
                    script = '''
                    tell application "System Events"
                        activate
                        set filePath to choose file with prompt "CSV dosyası seçin" of type {"csv"}
                        return POSIX path of filePath
                    end tell
                    '''
                else:
                    # Klasör modu: Klasör seç
                    script = '''
                    tell application "System Events"
                        activate
                        set folderPath to choose folder with prompt "CSV dosyalarınızın bulunduğu klasörü seçin"
                        return POSIX path of folderPath
                    end tell
                    '''
                
                result = subprocess.run(['osascript', '-e', script], 
                                      capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0 and result.stdout.strip():
                    selected_path = result.stdout.strip()
                    
                    # Klasör yolunun geçerli olup olmadığını kontrol et
                    if os.path.exists(selected_path):
                        if self.file_mode:
                            # Dosya modu: CSV dosyası kontrol et
                            if os.path.isfile(selected_path) and selected_path.endswith('.csv'):
                                # CSV dosyası seçildi
                                self.folder_path = selected_path
                                
                                # UI'yi güncelle
                                self.folder_display.content = ft.Column([
                                    ft.Icon(Icons.FILE_COPY, size=40, color=Colors.ORANGE_600),
                                    ft.Text(
                                        "CSV Dosyası Seçildi",
                                        size=16,
                                        text_align=ft.TextAlign.CENTER,
                                        color=Colors.ORANGE_600
                                    ),
                                    ft.Text(
                                        os.path.basename(selected_path),
                                        size=12,
                                        text_align=ft.TextAlign.CENTER,
                                        color=Colors.GREY_600
                                    )
                                ], alignment=ft.MainAxisAlignment.CENTER)
                                self.folder_display.bgcolor = Colors.ORANGE_50
                                self.folder_display.border = ft.border.all(2, Colors.ORANGE_200)
                                
                                self.show_success(f"CSV dosyası seçildi: {os.path.basename(selected_path)}")
                                self.page.update()
                            else:
                                self.show_error("Lütfen geçerli bir CSV dosyası seçin!")
                        elif os.path.isdir(selected_path):
                            # Tarih moduna göre farklı kontrol
                            if self.date_mode:
                                # Tarih modu: Alt klasörleri kontrol et
                                alt_klasorler = [d for d in os.listdir(selected_path) 
                                                if os.path.isdir(os.path.join(selected_path, d))]
                            
                            if alt_klasorler:
                                # Alt klasörlerde CSV dosyalarını say
                                total_csv_files = 0
                                for alt_klasor in alt_klasorler:
                                    alt_klasor_yolu = os.path.join(selected_path, alt_klasor)
                                    csv_files = [f for f in os.listdir(alt_klasor_yolu) if f.endswith('.csv')]
                                    total_csv_files += len(csv_files)
                                
                                if total_csv_files > 0:
                                    # Klasör yolunu ayarla
                                    self.folder_path = selected_path
                                    
                                    # UI'yi güncelle
                                    self.folder_display.content = ft.Column([
                                        ft.Icon(Icons.FOLDER, size=40, color=Colors.GREEN_600),
                                        ft.Text(
                                            "Ana Klasör Seçildi",
                                            size=16,
                                            text_align=ft.TextAlign.CENTER,
                                            color=Colors.GREEN_600
                                        ),
                                        ft.Text(
                                            os.path.basename(selected_path),
                                            size=12,
                                            text_align=ft.TextAlign.CENTER,
                                            color=Colors.GREY_600
                                        ),
                                        ft.Text(
                                            f"{len(alt_klasorler)} alt klasör, {total_csv_files} CSV dosyası",
                                            size=10,
                                            text_align=ft.TextAlign.CENTER,
                                            color=Colors.GREEN_600
                                        )
                                    ], alignment=ft.MainAxisAlignment.CENTER)
                                    self.folder_display.bgcolor = Colors.GREEN_50
                                    self.folder_display.border = ft.border.all(2, Colors.GREEN_200)
                                    
                                    self.show_success(f"Ana klasör seçildi: {os.path.basename(selected_path)} ({len(alt_klasorler)} alt klasör, {total_csv_files} CSV dosyası)")
                                    self.page.update()
                                else:
                                    self.show_error(f"Alt klasörlerde CSV dosyası bulunamadı: {os.path.basename(selected_path)}")
                            else:
                                self.show_error(f"Seçilen klasörde alt klasör bulunamadı: {os.path.basename(selected_path)}")
                        else:
                            # Normal mod: CSV dosyalarını kontrol et
                            csv_files = [f for f in os.listdir(selected_path) if f.endswith('.csv')]
                            
                            if csv_files:
                                # Klasör yolunu ayarla
                                self.folder_path = selected_path
                                
                                # UI'yi güncelle
                                self.folder_display.content = ft.Column([
                                    ft.Icon(Icons.FOLDER, size=40, color=Colors.GREEN_600),
                                    ft.Text(
                                        "Klasör Seçildi",
                                        size=16,
                                        text_align=ft.TextAlign.CENTER,
                                        color=Colors.GREEN_600
                                    ),
                                    ft.Text(
                                        os.path.basename(selected_path),
                                        size=12,
                                        text_align=ft.TextAlign.CENTER,
                                        color=Colors.GREY_600
                                    ),
                                    ft.Text(
                                        f"{len(csv_files)} CSV dosyası bulundu",
                                        size=10,
                                        text_align=ft.TextAlign.CENTER,
                                        color=Colors.GREEN_600
                                    )
                                ], alignment=ft.MainAxisAlignment.CENTER)
                                self.folder_display.bgcolor = Colors.GREEN_50
                                self.folder_display.border = ft.border.all(2, Colors.GREEN_200)
                                
                                self.show_success(f"Klasör seçildi: {os.path.basename(selected_path)} ({len(csv_files)} CSV dosyası)")
                                self.page.update()
                            else:
                                self.show_error(f"Seçilen klasörde CSV dosyası bulunamadı: {os.path.basename(selected_path)}")
                    else:
                        self.show_error("Geçersiz klasör yolu seçildi!")
                else:
                    # Kullanıcı iptal etti veya hata oluştu
                    if result.stderr:
                        self.show_error(f"Klasör seçici hatası: {result.stderr}")
                    else:
                        # Kullanıcı iptal etti, sessizce çık
                        pass
                        
            else:
                # Windows ve diğer sistemler için Flet'in kendi dosya seçicisini kullan
                self.folder_picker.get_directory_path()
                
        except subprocess.TimeoutExpired:
            self.show_error("Klasör seçici zaman aşımına uğradı!")
        except Exception as ex:
            self.show_error(f"Klasör seçici hatası: {str(ex)}")
            # Hata durumunda orijinal Flet dosya seçiciyi dene
            try:
                self.folder_picker.get_directory_path()
            except:
                pass
    

    
    def create_column_filters(self, df):
        """DataFrame'deki sayısal sütunlar için dinamik filtreler oluşturur"""
        self.column_filters_container.controls.clear()
        self.column_filters = {}
        
        # Sayısal sütunları bul
        numeric_columns = df.select_dtypes(include=['int64', 'float64']).columns.tolist()
        
        # Category ve Keyword sütunlarını hariç tut
        exclude_columns = ['Category', 'Keyword']
        numeric_columns = [col for col in numeric_columns if col not in exclude_columns]
        
        if not numeric_columns:
            self.column_filters_container.controls.append(
                ft.Text(
                    "Sayısal sütun bulunamadı",
                    size=12,
                    color=Colors.GREY_600,
                    italic=True
                )
            )
            return
        
        # Her sayısal sütun için filtre oluştur
        for i, column in enumerate(numeric_columns):
            try:
                # Sütun değerlerini al
                column_values = df[column].dropna()
                if column_values.empty:
                    continue
                
                min_val = float(column_values.min())
                max_val = float(column_values.max())
                
                # Eğer min ve max aynıysa, aralık oluştur
                if min_val == max_val:
                    min_val = min_val - 1
                    max_val = max_val + 1
                
                # Divisions hesapla (maksimum 100 bölüm)
                divisions = min(100, int(max_val - min_val) + 1)
                
                # Renk seç (döngüsel)
                colors = [
                    (Colors.BLUE_700, Colors.BLUE_300, Colors.BLUE_100),
                    (Colors.GREEN_700, Colors.GREEN_300, Colors.GREEN_100),
                    (Colors.PURPLE_700, Colors.PURPLE_300, Colors.PURPLE_100),
                    (Colors.ORANGE_700, Colors.ORANGE_300, Colors.ORANGE_100),
                    (Colors.RED_700, Colors.RED_300, Colors.RED_100),
                    (Colors.TEAL_700, Colors.TEAL_300, Colors.TEAL_100)
                ]
                active_color, inactive_color, overlay_color = colors[i % len(colors)]
                
                # Display text oluştur
                display_text = ft.Text(
                    f"{column}: {min_val:.1f} - {max_val:.1f}",
                    size=11,
                    color=active_color,
                    weight=FontWeight.BOLD
                )
                
                # Range slider oluştur
                range_slider = ft.RangeSlider(
                    min=min_val,
                    max=max_val,
                    start_value=min_val,
                    end_value=max_val,
                    divisions=divisions,
                    active_color=active_color,
                    inactive_color=inactive_color,
                    overlay_color=overlay_color,
                    label="{value}",
                    on_change=lambda e, col=column: self.on_column_range_changed(e, col),
                    expand=True
                )
                
                # Container oluştur
                container = ft.Container(
                    content=ft.Column([
                        display_text,
                        range_slider
                    ], spacing=5),
                    padding=10,
                    bgcolor=Colors.WHITE,
                    border_radius=6,
                    border=ft.border.all(1, inactive_color)
                )
                
                self.column_filters_container.controls.append(container)
                
                # Filtre değerlerini sakla
                self.column_filters[column] = {
                    'min': min_val,
                    'max': max_val,
                    'display': display_text,
                    'slider': range_slider
                }
                
            except Exception as e:
                print(f"Hata: {column} sütunu için filtre oluşturulamadı: {e}")
                continue
        
        self.page.update()
    
    def on_column_range_changed(self, e, column_name):
        """Sütun range slider değeri değiştiğinde çağrılır"""
        try:
            min_val = float(e.control.start_value)
            max_val = float(e.control.end_value)
            
            # Filtre değerlerini güncelle
            if column_name in self.column_filters:
                self.column_filters[column_name]['min'] = min_val
                self.column_filters[column_name]['max'] = max_val
                
                # Display text'i güncelle
                display_text = self.column_filters[column_name]['display']
                display_text.value = f"{column_name}: {min_val:.1f} - {max_val:.1f}"
            
            self.page.update()
            
            # Eğer şu anda tablo görüntüleniyorsa, otomatik filtrele
            if (self.current_table is not None and 
                hasattr(self, 'merged_noduplicate_df') and 
                self.merged_noduplicate_df is not None):
                self.apply_filters(None)
                
        except Exception as ex:
            print(f"Hata: {column_name} sütunu için değer güncellenemedi: {ex}")
    
    def on_date_mode_changed(self, e):
        """Tarih modu değiştiğinde çağrılır"""
        self.date_mode = e.control.value
        print(f"DEBUG: Tarih modu değişti: {self.date_mode}")
        
        # Diğer modları kapat
        if self.date_mode:
            self.file_mode = False
            self.file_mode_switch.value = False
        
    def on_file_mode_changed(self, e):
        """Dosya modu değiştiğinde çağrılır"""
        self.file_mode = e.control.value
        print(f"DEBUG: Dosya modu değişti: {self.file_mode}")
        
        # Diğer modları kapat
        if self.file_mode:
            self.date_mode = False
            self.date_mode_switch.value = False
        
    def on_non_latin_filter_changed(self, e):
        """Latin harici alfabe filtresinin durumu değiştiğinde çağrılır"""
        self.filter_non_latin = e.control.value
        
        # Eğer şu anda tablo görüntüleniyorsa, otomatik filtrele
        if (self.current_table is not None and 
            hasattr(self, 'merged_noduplicate_df') and 
            self.merged_noduplicate_df is not None):
            self.apply_filters(None)
    
    def add_search_term(self, e):
        """Arama terimine yeni kelime ekler"""
        term = self.keyword_search_input.value.strip()
        if not term:
            return
        
        # Aynı terim zaten var mı kontrol et
        if term.lower() not in [t.lower() for t in self.search_terms_list]:
            self.search_terms_list.append(term)
            self.update_search_terms_display()
            
            # Input'u temizle
            self.keyword_search_input.value = ""
            self.page.update()
            
            # Filtreleri uygula
            self.apply_filters(None)
    
    def add_exclude_term(self, e):
        """İstenmeyen kelime ekler"""
        term = self.keyword_search_input.value.strip()
        if not term:
            return
        
        # Aynı terim zaten var mı kontrol et
        if term.lower() not in [t.lower() for t in self.exclude_terms_list]:
            self.exclude_terms_list.append(term)
            self.update_search_terms_display()
            
            # Input'u temizle
            self.keyword_search_input.value = ""
            self.page.update()
            
            # Filtreleri uygula
            self.apply_filters(None)
    
    def remove_search_term(self, term):
        """Arama terimini listeden kaldırır"""
        if term in self.search_terms_list:
            self.search_terms_list.remove(term)
            self.update_search_terms_display()
            
            # Filtreleri yeniden uygula
            self.apply_filters(None)
    
    def remove_exclude_term(self, term):
        """İstenmeyen kelimeyi listeden kaldırır"""
        if term in self.exclude_terms_list:
            self.exclude_terms_list.remove(term)
            self.update_search_terms_display()
            
            # Filtreleri yeniden uygula
            self.apply_filters(None)
    
    def update_search_terms_display(self):
        """Arama terimleri görüntüsünü günceller"""
        self.search_terms_container.controls.clear()
        
        # Dahil edilecek terimler (mavi)
        for term in self.search_terms_list:
            chip = ft.Container(
                content=ft.Row([
                    ft.Icon(Icons.ADD, size=14, color=Colors.WHITE),
                    ft.Text(
                        term,
                        size=12,
                        color=Colors.WHITE,
                        weight=FontWeight.BOLD
                    ),
                    ft.IconButton(
                        icon=Icons.CLOSE,
                        icon_size=16,
                        icon_color=Colors.WHITE,
                        on_click=lambda e, t=term: self.remove_search_term(t),
                        tooltip=f"'{term}' terimini kaldır"
                    )
                ], spacing=2),
                bgcolor=Colors.BLUE_600,
                border_radius=20,
                padding=ft.padding.symmetric(horizontal=12, vertical=5),
                margin=ft.margin.symmetric(horizontal=2, vertical=2)
            )
            self.search_terms_container.controls.append(chip)
        
        # Çıkarılacak terimler (kırmızı)
        for term in self.exclude_terms_list:
            chip = ft.Container(
                content=ft.Row([
                    ft.Icon(Icons.REMOVE, size=14, color=Colors.WHITE),
                    ft.Text(
                        term,
                        size=12,
                        color=Colors.WHITE,
                        weight=FontWeight.BOLD
                    ),
                    ft.IconButton(
                        icon=Icons.CLOSE,
                        icon_size=16,
                        icon_color=Colors.WHITE,
                        on_click=lambda e, t=term: self.remove_exclude_term(t),
                        tooltip=f"'{term}' çıkarma terimini kaldır"
                    )
                ], spacing=2),
                bgcolor=Colors.RED_600,
                border_radius=20,
                padding=ft.padding.symmetric(horizontal=12, vertical=5),
                margin=ft.margin.symmetric(horizontal=2, vertical=2)
            )
            self.search_terms_container.controls.append(chip)
        
        # Eğer hiç terim yoksa placeholder göster
        if not self.search_terms_list and not self.exclude_terms_list:
            placeholder = ft.Text(
                "Henüz arama terimi eklenmedi",
                size=12,
                color=Colors.GREY_500,
                italic=True
            )
            self.search_terms_container.controls.append(placeholder)
        
        self.page.update()
    
    def is_latin_only_keyword(self, keyword):
        """Keyword'ün sadece Latin alfabesi kullanıp kullanmadığını kontrol eder.
        Sadece başındaki ve sonundaki harfleri kontrol eder (performans için)."""
        if not keyword or not isinstance(keyword, str):
            return True
        
        # Keyword'ü temizle (whitespace kaldır)
        keyword = keyword.strip()
        if not keyword:
            return True
        
        # Sadece alfabetik karakterleri kontrol et
        letters_only = ''.join([c for c in keyword if c.isalpha()])
        if not letters_only:
            return True  # Harf yoksa Latin sayılır
        
        # Baştan ve sondan birer harf kontrol et
        chars_to_check = []
        
        # İlk harf
        if len(letters_only) > 0:
            chars_to_check.append(letters_only[0])
        
        # Son harf (ilk harfle aynı değilse)
        if len(letters_only) > 1:
            chars_to_check.append(letters_only[-1])
        
        # Her karakteri kontrol et
        for char in chars_to_check:
            try:
                char_name = unicodedata.name(char, '')
                # LATIN içerip içermediğini kontrol et
                if 'LATIN' not in char_name.upper():
                    return False
            except ValueError:
                # Karakter adı bulunamadıysa, güvenli tarafta kal
                return False
        
        return True

    
    def apply_filters(self, e):
        """Tüm filtreleri uygular ve mevcut tabloyu günceller"""
        if self.merged_noduplicate_df is None:
            self.show_warning("Önce verileri yükleyin!")
            return
        
        try:
            # Filtrelenmiş DataFrame oluştur
            filtered_df = self.merged_noduplicate_df.copy()
            
            # Dinamik sütun filtreleri uygula
            for column_name, filter_data in self.column_filters.items():
                if column_name in filtered_df.columns:
                    min_val = filter_data['min']
                    max_val = filter_data['max']
                    
                    # Sadece varsayılan aralık değilse filtrele
                    column_values = filtered_df[column_name].dropna()
                    if not column_values.empty:
                        column_min = float(column_values.min())
                        column_max = float(column_values.max())
                        
                        if min_val > column_min or max_val < column_max:
                            filtered_df = filtered_df[
                                (filtered_df[column_name] >= min_val) & 
                                (filtered_df[column_name] <= max_val)
                            ]
            
            # Çoklu keyword arama filtresi (SQL OR mantığı - Tam eşleşme + Prefix + Suffix)
            if self.search_terms_list:
                # Her terim için 3 farklı kondisyon: tam eşleşme, prefix, suffix
                conditions = []
                for term in self.search_terms_list:
                    term_lower = term.lower()
                    keyword_lower = filtered_df['Keyword'].str.lower()
                    
                    # 1. Tam eşleşme: keyword = 'ai'
                    exact_match = keyword_lower == term_lower
                    
                    # 2. Başında geçenler: keyword LIKE 'ai%' 
                    starts_with = keyword_lower.str.startswith(term_lower)
                    
                    # 3. Sonunda geçenler: keyword LIKE '%ai'
                    ends_with = keyword_lower.str.endswith(term_lower)
                    
                    # Bu terimin tüm kondisyonlarını OR ile birleştir
                    term_condition = exact_match | starts_with | ends_with
                    conditions.append(term_condition)
                
                # Tüm terimlerin kondisyonlarını OR ile birleştir (| operatörü)
                if conditions:
                    combined_condition = conditions[0]
                    for condition in conditions[1:]:
                        combined_condition = combined_condition | condition
                    
                    filtered_df = filtered_df[combined_condition]
            
            # Çıkarılacak kelimeler filtresi (SQL NOT mantığı)
            if self.exclude_terms_list:
                # Her çıkarılacak terim için NOT kondisyonu oluştur
                exclude_conditions = []
                for term in self.exclude_terms_list:
                    term_lower = term.lower()
                    keyword_lower = filtered_df['Keyword'].str.lower()
                    
                    # Tam eşleşme VEYA prefix VEYA suffix olan keyword'leri çıkar
                    exact_match = keyword_lower == term_lower
                    starts_with = keyword_lower.str.startswith(term_lower)
                    ends_with = keyword_lower.str.endswith(term_lower)
                    
                    # Bu terimin tüm kondisyonlarını OR ile birleştir (eşleşenleri bul)
                    term_to_exclude = exact_match | starts_with | ends_with
                    exclude_conditions.append(term_to_exclude)
                
                # Tüm çıkarılacak kondisyonları OR ile birleştir
                if exclude_conditions:
                    combined_exclude_condition = exclude_conditions[0]
                    for condition in exclude_conditions[1:]:
                        combined_exclude_condition = combined_exclude_condition | condition
                    
                    # NOT mantığı: Eşleşmeyen satırları tut (~combined_exclude_condition)
                    filtered_df = filtered_df[~combined_exclude_condition]
            
            # Latin harici alfabe filtresi
            if self.filter_non_latin:
                # Sadece Latin alfabesi kullanan keyword'leri tut
                latin_mask = filtered_df['Keyword'].apply(self.is_latin_only_keyword)
                filtered_df = filtered_df[latin_mask]
            
            # Filtrelenmiş veriyi göster
            if filtered_df.empty:
                self.show_warning("Filtre kriterlerine uygun veri bulunamadı!")
                return
            
            # Başlığı dinamik olarak oluştur
            title_parts = []
            
            # Dinamik sütun filtrelerini başlığa ekle
            for column_name, filter_data in self.column_filters.items():
                if column_name in filtered_df.columns:
                    min_val = filter_data['min']
                    max_val = filter_data['max']
                    
                    # Sadece varsayılan aralık değilse ekle
                    column_values = filtered_df[column_name].dropna()
                    if not column_values.empty:
                        column_min = float(column_values.min())
                        column_max = float(column_values.max())
                        
                        if min_val > column_min or max_val < column_max:
                            title_parts.append(f"{column_name}: {min_val:.1f}-{max_val:.1f}")
            
            if self.search_terms_list:
                search_terms_str = " OR ".join([f"'{term}'" for term in self.search_terms_list])
                title_parts.append(f"Include: {search_terms_str}")
            if self.exclude_terms_list:
                exclude_terms_str = " OR ".join([f"'{term}'" for term in self.exclude_terms_list])
                title_parts.append(f"Exclude: {exclude_terms_str}")
            if self.filter_non_latin:
                title_parts.append("Latin Only")
            
            if title_parts:
                title = f"Filtrelenmiş Tablo ({', '.join(title_parts)})"
            else:
                title = "Filtrelenmiş Tablo"
            
            self.display_dataframe(filtered_df, title)
            self.current_table = filtered_df
            
            filter_info = []
            
            # Dinamik sütun filtrelerini bilgi mesajına ekle
            for column_name, filter_data in self.column_filters.items():
                if column_name in filtered_df.columns:
                    min_val = filter_data['min']
                    max_val = filter_data['max']
                    
                    # Sadece varsayılan aralık değilse ekle
                    column_values = filtered_df[column_name].dropna()
                    if not column_values.empty:
                        column_min = float(column_values.min())
                        column_max = float(column_values.max())
                        
                        if min_val > column_min or max_val < column_max:
                            filter_info.append(f"{column_name}: {min_val:.1f}-{max_val:.1f}")
            
            if self.search_terms_list:
                filter_info.append(f"Include: {' OR '.join(self.search_terms_list)}")
            if self.exclude_terms_list:
                filter_info.append(f"Exclude: {' OR '.join(self.exclude_terms_list)}")
            if self.filter_non_latin:
                filter_info.append("Sadece Latin alfabesi")
            
            if filter_info:
                self.show_success(f"Filtreler uygulandı ({', '.join(filter_info)})! {len(filtered_df)} kayıt gösteriliyor.")
            else:
                self.show_success(f"Tüm veriler gösteriliyor! {len(filtered_df)} kayıt.")
            
        except Exception as ex:
            self.show_error(f"Filtre uygulama hatası: {str(ex)}")
    
    def sort_table_data(self, e):
        """Tablo sütunlarını sıralar"""
        if self.current_table is None or self.current_table.empty:
            return
        
        try:
            # Tıklanan sütunun indeksi ve sıralama yönü güncellenir
            if self.sort_column_index == e.column_index:
                self.sort_ascending = not self.sort_ascending
            else:
                self.sort_column_index = e.column_index
                self.sort_ascending = True
            
            # DataFrame sütun adını al
            column_name = self.current_table.columns[e.column_index]
            
            # DataFrame'i sırala
            if column_name in ['Volume', 'Difficulty', 'Frekans', 'Growth (Max Reach)']:
                # Sayısal sütunlar için numeric sorting
                self.current_table = self.current_table.sort_values(
                    by=column_name, 
                    ascending=self.sort_ascending,
                    kind='mergesort'  # Stable sort
                )
            else:
                # String sütunlar için string sorting
                self.current_table = self.current_table.sort_values(
                    by=column_name, 
                    ascending=self.sort_ascending,
                    kind='mergesort'  # Stable sort
                )
            
            # Sıralanmış veriyi yeniden göster
            self.refresh_table_display()
            
        except Exception as ex:
            self.show_error(f"Sıralama hatası: {str(ex)}")
    
    def refresh_table_display(self):
        """Tabloyu yeniden yükler ve sıralama bilgilerini günceller"""
        if self.current_table is None or self.current_table.empty:
            return
        
        # Mevcut başlığı koru
        current_title = self.table_title.value
        
        # Clear existing data
        self.data_table.columns.clear()
        self.data_table.rows.clear()
        
        # Add columns with sorting capability
        for idx, col in enumerate(self.current_table.columns):
            # Sütun türüne göre numeric belirleme
            is_numeric = col in ['Volume', 'Difficulty', 'Frekans', 'Growth (Max Reach)']
            
            self.data_table.columns.append(
                ft.DataColumn(
                    ft.Text(
                        str(col),
                        size=12,
                        weight=FontWeight.BOLD,
                        color=Colors.BLUE_700
                    ),
                    on_sort=self.sort_table_data,
                    numeric=is_numeric
                )
            )
        
        # Add rows
        for idx, row in self.current_table.iterrows():
            cells = []
            for value in row:
                cells.append(
                    ft.DataCell(
                        ft.Text(
                            str(value),
                            size=11,
                            color=Colors.BLACK87
                        )
                    )
                )
            self.data_table.rows.append(ft.DataRow(cells=cells))
        
        # Update sorting properties
        self.data_table.sort_column_index = self.sort_column_index
        self.data_table.sort_ascending = self.sort_ascending
        
        self.page.update()
    
    def load_data(self, e):
        if not self.folder_path:
            self.show_error("Lütfen önce bir klasör seçin!")
            return
        
        print(f"DEBUG: load_data() çağrıldı. Folder path: {self.folder_path}")
        print(f"DEBUG: Date mode: {self.date_mode}")
        print(f"DEBUG: File mode: {self.file_mode}")
        
        try:
            # Show loading
            if self.date_mode:
                self.show_loading("Çoklu klasör verileri yükleniyor...")
            elif self.file_mode:
                self.show_loading("Tek CSV dosyası yükleniyor...")
            else:
                self.show_loading("Veriler yükleniyor...")
            
            # Moda göre farklı fonksiyonları çağır
            if self.date_mode:
                # Çoklu klasör modu - tarih bilgisi ile
                print(f"DEBUG: merged_with_date_df() çağrılıyor...")
                self.merged_noduplicate_df = Df_Get.merged_with_date_df(self.folder_path)
                print(f"DEBUG: merged_with_date_df() tamamlandı. DataFrame şekli: {self.merged_noduplicate_df.shape}")
                self.show_success("Çoklu klasör verileri başarıyla yüklendi!")
            elif self.file_mode:
                # Tek CSV dosyası modu
                print(f"DEBUG: single_csv_df() çağrılıyor...")
                self.merged_noduplicate_df = Df_Get.single_csv_df(self.folder_path)
                print(f"DEBUG: single_csv_df() tamamlandı. DataFrame şekli: {self.merged_noduplicate_df.shape}")
                self.show_success("Tek CSV dosyası başarıyla yüklendi!")
            else:
                # Tek klasör modu - normal
                print(f"DEBUG: merged_noduplicate_df() çağrılıyor...")
                self.merged_noduplicate_df = Df_Get.merged_noduplicate_df(self.folder_path)
                print(f"DEBUG: merged_noduplicate_df() tamamlandı. DataFrame şekli: {self.merged_noduplicate_df.shape}")
                self.show_success("Veriler başarıyla yüklendi!")
            
            # Sütun filtrelerini oluştur
            print(f"DEBUG: create_column_filters() çağrılıyor...")
            self.create_column_filters(self.merged_noduplicate_df)
            
            self.hide_loading()
            
        except Exception as ex:
            print(f"DEBUG: Hata oluştu: {str(ex)}")
            import traceback
            traceback.print_exc()
            self.hide_loading()
            self.show_error(f"Veri yükleme hatası: {str(ex)}")
    
    def show_merged_table(self, e):
        if self.merged_noduplicate_df is None:
            self.show_warning("Önce verileri yükleyin!")
            return
        
        # Dinamik sütun filtreleri uygula
        try:
            filtered_df = self.merged_noduplicate_df.copy()
            
            # Aktif filtreleri topla
            active_filters = []
            for column_name, filter_data in self.column_filters.items():
                if column_name in filtered_df.columns:
                    min_val = filter_data['min']
                    max_val = filter_data['max']
                    
                    # Sadece varsayılan aralık değilse filtrele
                    column_values = filtered_df[column_name].dropna()
                    if not column_values.empty:
                        column_min = float(column_values.min())
                        column_max = float(column_values.max())
                        
                        if min_val > column_min or max_val < column_max:
                            filtered_df = filtered_df[
                                (filtered_df[column_name] >= min_val) & 
                                (filtered_df[column_name] <= max_val)
                            ]
                            active_filters.append(f"{column_name}: {min_val:.1f}-{max_val:.1f}")
            
            # Başlık oluştur
            if active_filters:
                title = f"Birleştirilmiş Ana Tablo ({', '.join(active_filters)})"
            else:
                title = "Birleştirilmiş Ana Tablo"
            
            self.display_dataframe(filtered_df, title)
            self.current_table = filtered_df
            self.show_success(f"Sütun filtreleri uygulandı! {len(filtered_df)} kayıt gösteriliyor.")
            
        except Exception as ex:
            self.show_error(f"Filtreleme hatası: {str(ex)}")
            # Hata durumunda orijinal tabloyu göster
            self.display_dataframe(self.merged_noduplicate_df, "Birleştirilmiş Ana Tablo")
            self.current_table = self.merged_noduplicate_df
    
    def show_merged_table_all(self, e):
        """Tüm verileri difficulty filtresi olmadan göster"""
        if self.merged_noduplicate_df is None:
            self.show_warning("Önce verileri yükleyin!")
            return
        
        self.display_dataframe(self.merged_noduplicate_df, "Birleştirilmiş Ana Tablo (Tüm Veriler)")
        self.current_table = self.merged_noduplicate_df
        self.show_success(f"Tüm veriler gösteriliyor! {len(self.merged_noduplicate_df)} kayıt.")
    

    
    def display_dataframe(self, df: pd.DataFrame, title: str):
        if df is None or df.empty:
            self.show_warning("Tablo boş!")
            return
        
        # Update table title
        self.table_title.value = title
        
        # Sıralama durumunu sıfırla (yeni veri için)
        self.sort_column_index = 0
        self.sort_ascending = True
        
        # Current table'ı güncelle
        self.current_table = df.copy()
        
        # Clear existing data
        self.data_table.columns.clear()
        self.data_table.rows.clear()
        
        # Add columns with sorting capability
        for idx, col in enumerate(df.columns):
            # Sütun türüne göre numeric belirleme
            is_numeric = col in ['Volume', 'Difficulty', 'Frekans', 'Growth (Max Reach)']
            
            self.data_table.columns.append(
                ft.DataColumn(
                    ft.Text(
                        str(col),
                        size=12,
                        weight=FontWeight.BOLD,
                        color=Colors.BLUE_700
                    ),
                    on_sort=self.sort_table_data,
                    numeric=is_numeric
                )
            )
        
        # Add rows
        for idx, row in df.iterrows():   
            cells = []
            for value in row:
                cells.append(
                    ft.DataCell(
                        ft.Text(
                            str(value),
                            size=11,
                            color=Colors.BLACK87
                        )
                    )
                )
            self.data_table.rows.append(ft.DataRow(cells=cells))
        
        # Update sorting properties
        self.data_table.sort_column_index = self.sort_column_index
        self.data_table.sort_ascending = self.sort_ascending
        
        self.page.update()
    
    def export_table(self, e):
        if self.current_table is None:
            self.show_warning("Dışa aktarılacak tablo yok!")
            return
        
        try:
            # Kullanıcının girdiği dosya adını al, yoksa varsayılan ad kullan
            custom_filename = self.filename_input.value.strip()
            if custom_filename:
                # Güvenli dosya adı oluştur (özel karakterleri temizle)
                import re
                safe_filename = re.sub(r'[<>:"/\\|?*]', '_', custom_filename)
                base_filename = safe_filename
            else:
                base_filename = "aso_table"
            
            # Timestamp ekle
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{base_filename}_{timestamp}.xlsx"
            
            self.show_loading(f"Excel dosyası hazırlanıyor: {filename}")
            
            # Create Excel file in memory
            buffer = io.BytesIO()
            with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                self.current_table.to_excel(writer, index=False, sheet_name='ASO Data')
            
            excel_data = buffer.getvalue()
            
            # Save to project directory and Desktop
            project_path = os.path.join(os.getcwd(), filename)
            desktop_path = os.path.join(os.path.expanduser("~"), "Desktop", filename)
            
            # Save Excel files
            with open(project_path, 'wb') as f:
                f.write(excel_data)
            
            try:
                with open(desktop_path, 'wb') as f:
                    f.write(excel_data)
                self.hide_loading()
                self.show_success(f"✅ Excel dosyası kaydedildi!\n📁 Proje: {filename}\n🖥️ Masaüstü: {filename}")
            except PermissionError:
                self.hide_loading()
                self.show_success(f"✅ Excel dosyası proje klasörüne kaydedildi: {filename}")
            
            # Dosya adı alanını temizle
            self.filename_input.value = ""
            self.page.update()
            
        except Exception as ex:
            self.hide_loading()
            # Excel başarısız olursa CSV'ye geç
            try:
                custom_filename = self.filename_input.value.strip()
                if custom_filename:
                    import re
                    safe_filename = re.sub(r'[<>:"/\\|?*]', '_', custom_filename)
                    base_filename = safe_filename
                else:
                    base_filename = "aso_table"
                
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                csv_filename = f"{base_filename}_{timestamp}.csv"
                csv_project_path = os.path.join(os.getcwd(), csv_filename)
                csv_desktop_path = os.path.join(os.path.expanduser("~"), "Desktop", csv_filename)
                
                # Save CSV files
                self.current_table.to_csv(csv_project_path, index=False)
                
                try:
                    self.current_table.to_csv(csv_desktop_path, index=False)
                    self.show_warning(f"⚠️ Excel başarısız, CSV kaydedildi!\n📁 Proje: {csv_filename}\n🖥️ Masaüstü: {csv_filename}")
                except PermissionError:
                    self.show_warning(f"⚠️ Excel başarısız, CSV proje klasörüne kaydedildi: {csv_filename}")
                
                # Dosya adı alanını temizle
                self.filename_input.value = ""
                self.page.update()
                    
            except Exception as csv_ex:
                self.show_error(f"❌ Dosya kaydetme başarısız: {str(csv_ex)}")
                # Dosya adı alanını temizle
                self.filename_input.value = ""
                self.page.update()
    
    # Utility methods
    def show_loading(self, message: str):
        self.page.splash = ft.ProgressBar()
        self.page.update()
    
    def hide_loading(self):
        self.page.splash = None
        self.page.update()
    
    def show_error(self, message: str):
        self.page.show_snack_bar(
            ft.SnackBar(
                content=ft.Text(message, color=Colors.WHITE),
                bgcolor=Colors.RED_600
            )
        )
    
    def show_warning(self, message: str):
        self.page.show_snack_bar(
            ft.SnackBar(
                content=ft.Text(message, color=Colors.WHITE),
                bgcolor=Colors.ORANGE_600
            )
        )
    
    def show_success(self, message: str):
        self.page.show_snack_bar(
            ft.SnackBar(
                content=ft.Text(message, color=Colors.WHITE),
                bgcolor=Colors.GREEN_600
            )
        )

def main(page: ft.Page):
    ASOApp(page)

if __name__ == "__main__":
    # Flet otomatik olarak en uygun view'ı seçecek
    ft.app(target=main) 
