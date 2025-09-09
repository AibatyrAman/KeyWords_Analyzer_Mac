import { KeywordData, AnalyzedKeywordData, KeywordAnalysisResult } from '../types';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

export class SimilarKeywordFinder {
  
  /**
   * Ortak GPT API çağrı fonksiyonu
   */
  private static async _executeGptCompletion(
    systemPrompt: string, 
    userPrompt: string, 
    maxTokens: number = 1000
  ): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API hatası: ${response.status}. Lütfen tekrar deneyin.`);
    }

    const result = await response.json();
    
    if (!result.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response:', result);
      throw new Error('OpenAI API yanıtı geçersiz. Lütfen tekrar deneyin.');
    }
    
    return JSON.parse(result.choices[0].message.content.trim());
  }

  /**
   * GPT API kullanarak benzer keyword'leri bul
   */
  static async findSimilarKeywords(
    searchTerm: string, 
    availableKeywords: string[], 
    maxResults: number = 1000
  ): Promise<string[]> {
    try {
      const systemPrompt = `
You are an expert in keyword analysis, semantic similarity, and typo detection. Your task is to analyze a search term and find similar keywords from a provided list.

Your analysis should include:
1. **Semantic Similarity**: Keywords with similar meaning or concept
2. **Typo Detection**: Keywords that might be typos or misspellings of the search term
3. **Variations**: Different forms, abbreviations, or alternative spellings
4. **Related Concepts**: Keywords that are contextually related
5. **Partial Matches**: Keywords that contain parts of the search term

Analysis Rules:
- Focus on finding ALL possible matches within the provided keyword list
- Consider typos, misspellings, and common variations
- Look for semantic similarities and related concepts
- Return only keywords that exist in the provided list
- Return maximum ${maxResults} keywords
- Return results as a JSON object with a "keywords" array

Example response format:
{
  "keywords": ["weather", "weater", "wether", "weather app", "weather forecast", "climate", "temperature"]
}
`;

      const userPrompt = `
Search term: "${searchTerm}"

Available keywords to search within:
${availableKeywords.join(', ')}

Please analyze the search term and find ALL similar keywords from the above list, including:
- Exact matches
- Typos and misspellings
- Semantic similarities
- Related concepts
- Partial matches

Return the most relevant keywords as a JSON object with a "keywords" array, ordered by relevance:
`;

      const result = await this._executeGptCompletion(systemPrompt, userPrompt, 1000);
      
      let similarKeywords: string[] = [];
      if (result.keywords && Array.isArray(result.keywords)) {
        similarKeywords = result.keywords;
      } else if (Array.isArray(result)) {
        similarKeywords = result;
      }
      
      // Validate that all returned keywords exist in the original list
      similarKeywords = similarKeywords.filter(keyword => 
        availableKeywords.includes(keyword)
      );
      
      // Limit to maxResults
      similarKeywords = similarKeywords.slice(0, maxResults);

      return similarKeywords;

    } catch (error) {
      console.error('Error finding similar keywords:', error);
      // Fallback to enhanced matching if API fails
      return this.enhancedFallbackSimilarKeywords(searchTerm, availableKeywords, maxResults);
    }
  }

  /**
   * Enhanced fallback method for finding similar keywords with typo detection
   */
  private static enhancedFallbackSimilarKeywords(
    searchTerm: string, 
    availableKeywords: string[], 
    maxResults: number
  ): string[] {
    const searchWords = searchTerm.toLowerCase().split(/\s+/);
    
    const scoredKeywords = availableKeywords.map(keyword => {
      const keywordWords = keyword.toLowerCase().split(/\s+/);
      let score = 0;
      
      // Exact match gets highest score
      if (keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
        score += 15;
      }
      
      // Exact word match
      if (keyword.toLowerCase() === searchTerm.toLowerCase()) {
        score += 20;
      }
      
      // Word overlap scoring
      searchWords.forEach(searchWord => {
        keywordWords.forEach(keywordWord => {
          if (keywordWord.includes(searchWord) || searchWord.includes(keywordWord)) {
            score += 3;
          }
          if (keywordWord === searchWord) {
            score += 8;
          }
          
          // Typo detection using Levenshtein distance
          const similarity = this.calculateStringSimilarity(searchWord, keywordWord);
          if (similarity > 0.8) {
            score += 5;
          } else if (similarity > 0.6) {
            score += 2;
          }
        });
      });
      
      // Partial match scoring
      if (keyword.toLowerCase().includes(searchTerm.toLowerCase().slice(0, 3))) {
        score += 1;
      }
      
      return { keyword, score };
    });
    
    return scoredKeywords
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.keyword);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    return (longer.length - this.levenshteinDistance(longer, shorter)) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Fallback method for finding similar keywords using simple string matching
   */
  private static fallbackSimilarKeywords(
    searchTerm: string, 
    availableKeywords: string[], 
    maxResults: number
  ): string[] {
    const searchWords = searchTerm.toLowerCase().split(/\s+/);
    
    const scoredKeywords = availableKeywords.map(keyword => {
      const keywordWords = keyword.toLowerCase().split(/\s+/);
      let score = 0;
      
      // Exact match gets highest score
      if (keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
        score += 10;
      }
      
      // Word overlap scoring
      searchWords.forEach(searchWord => {
        keywordWords.forEach(keywordWord => {
          if (keywordWord.includes(searchWord) || searchWord.includes(keywordWord)) {
            score += 2;
          }
          if (keywordWord === searchWord) {
            score += 5;
          }
        });
      });
      
      return { keyword, score };
    });
    
    return scoredKeywords
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.keyword);
  }

  /**
   * GPT ile girdiğiniz keyword ile alakalı tablodaki tüm keyword'leri bul
   * Kategorize edilmiş, açıklanmış ve puanlanmış sonuçlar döndürür
   */
    /**
   * GPT ile girdiğiniz keyword ile alakalı tablodaki tüm keyword'leri bul
   * Kategorize edilmiş, açıklanmış ve puanlanmış sonuçlar döndürür
   */
     static async findRelatedKeywordsFromTable(
       searchTerm: string,
       tableData: KeywordData[],
       maxResults: number = 100,
       similarityThreshold: number = 0.8
     ): Promise<AnalyzedKeywordData[]> {
       try {
         // Arama terimini yeşil renkte logla
         console.log('\x1b[32m%s\x1b[0m', `🔍 Searching for: "${searchTerm}"`);
         console.log('\x1b[32m%s\x1b[0m', `📊 Total keywords in table: ${tableData.length}`);
         
         const availableKeywords = tableData.map(item => item.Keyword).filter(Boolean) as string[];
  
        // DEĞİŞİKLİK 1: YEREL ÖN FİLTRELEME ADIMINI KALDIRDIK.
        // Artık aday listesi oluşturmuyoruz, tüm listeyi GPT'ye analiz ettireceğiz.
        // Bu sayede "learn" ve "education" gibi anlamsal olarak ilişkili ama
        // metinsel olarak benzemeyen kelimeler bulunabilir.
        if (availableKeywords.length === 0) {
          return [];
        }
        
        // DEĞİŞİKLİK 2: SYSTEM PROMPT'U GÜNCELLEDİK.
        // GPT'ye daha net bir şekilde kavramsal ve tematik ilişkileri bulmasını söylüyoruz.
        const systemPrompt = `
  You are an expert ASO (App Store Optimization) keyword analyst. Your primary goal is to find keywords that are conceptually and thematically related to a search term from a provided list, even if the words themselves are different.
  
  For each relevant keyword you find, you must provide:
  1. **category**: A logical grouping for the keyword (e.g., "Education & Learning", "Productivity", "AI & Technology").
  2. **reason**: A brief, one-sentence explanation of why this keyword is thematically relevant to the search term in an ASO context and what user intent it captures.
  3. **relevanceScore**: An estimated score from 1 to 100 indicating how strong the conceptual link is.
  
  Analysis Rules:
  - Return ONLY keywords that exist in the provided list.
  - Prioritize semantic and conceptual relevance over simple word matching.
  - The output MUST be a valid JSON object with a "keywords" array.
  - Each object in the array must conform to the structure: { "keyword": "...", "category": "...", "reason": "...", "relevanceScore": ... }
  - Order the results by relevanceScore in descending order.
  - Think about the user's intent. For example, a user searching for "learn" might be interested in "classdojo" (a classroom app) or "babbel" (a language learning app).
  
  Example for search term "learn":
  {
    "keywords": [
      {
        "keyword": "classdojo",
        "category": "Education & Learning",
        "reason": "This is a popular classroom communication app, directly targeting the education and learning sector.",
        "relevanceScore": 95
      },
      {
        "keyword": "babbel language learning",
        "category": "Education & Learning",
        "reason": "Targets users specifically looking to learn a new language, a strong subset of the 'learn' intent.",
        "relevanceScore": 92
      },
      {
        "keyword": "google deepmind",
        "category": "AI & Technology",
        "reason": "Represents a company focused on AI research and learning, appealing to a tech-savvy audience interested in learning.",
        "relevanceScore": 70
      }
    ]
  }
  `;
  
        const userPrompt = `
  Search term: "${searchTerm}"
  
  Available keywords to search within (${availableKeywords.length} total):
  ${availableKeywords.join(', ')}
  
  Please analyze the search term "${searchTerm}" and find ALL thematically and conceptually related keywords from the above list for mobile app ASO purposes.
  
  Focus on the user's intent and find related concepts, not just similar words. Return the most relevant keywords as a JSON object with a "keywords" array, ordered by relevance:
  `;
  
         // API'ye artık filtrelenmemiş tam listeyi gönderiyoruz.
         const result = await this._executeGptCompletion(systemPrompt, userPrompt, 2000);
         
         // GPT'den gelen ham sonucu yeşil renkte logla
         console.log('\x1b[32m%s\x1b[0m', '🤖 GPT Raw Response:');
         console.log('\x1b[32m%s\x1b[0m', JSON.stringify(result, null, 2));
         
         let analyzedResults: KeywordAnalysisResult[] = [];
         if (result.keywords && Array.isArray(result.keywords)) {
           analyzedResults = result.keywords;
         } else if (Array.isArray(result)) {
           analyzedResults = result;
         }
         
         // İşlenmiş sonuçları da yeşil renkte logla
         console.log('\x1b[32m%s\x1b[0m', '📊 Processed Results:');
         console.log('\x1b[32m%s\x1b[0m', JSON.stringify(analyzedResults, null, 2));
        
        // Validate that
      
      // Validate that all returned keywords exist in the original list
      analyzedResults = analyzedResults.filter(item => 
        availableKeywords.includes(item.keyword)
      );
      
      // Limit to maxResults
      analyzedResults = analyzedResults.slice(0, maxResults);

      // Orijinal tableData ile API'den gelen sonuçları birleştir
      const finalResults: AnalyzedKeywordData[] = [];
      const keywordMap = new Map(tableData.map(item => [item.Keyword, item]));

      for (const res of analyzedResults) {
        let bestMatch: { keyword: string; similarity: number; data: KeywordData } | null = null;
        
        // Her API sonucu için en iyi eşleşmeyi bul
        const keywordEntries = Array.from(keywordMap.entries());
        for (let i = 0; i < keywordEntries.length; i++) {
          const [originalKeyword, originalData] = keywordEntries[i];
          const similarity = this.calculateStringSimilarity(res.keyword.toLowerCase(), originalKeyword.toLowerCase());
          
          if (similarity > (bestMatch?.similarity || 0)) {
            bestMatch = {
              keyword: originalKeyword,
              similarity: similarity,
              data: originalData
            };
          }
        }
        
        // Eğer en iyi eşleşme threshold'u geçiyorsa, sonuca ekle
        if (bestMatch && bestMatch.similarity >= similarityThreshold) {
          finalResults.push({
            ...bestMatch.data,
            category: res.category,
            reason: res.reason,
            relevanceScore: res.relevanceScore,
          });
        }
      }

      // Final sonuçları yeşil renkte logla
      console.log('\x1b[32m%s\x1b[0m', '🎯 Final Analyzed Keywords:');
      console.log('\x1b[32m%s\x1b[0m', JSON.stringify(finalResults, null, 2));
      console.log('\x1b[32m%s\x1b[0m', `📈 Total found: ${finalResults.length} keywords`);

      return finalResults;

    } catch (error) {
      console.error('Error finding related keywords:', error);
      // Fallback to enhanced matching if API fails
      const availableKeywords = tableData.map(item => item.Keyword).filter(Boolean) as string[];
      const fallbackKeywords = this.enhancedFallbackSimilarKeywords(searchTerm, availableKeywords, maxResults);
      
      // Fallback sonucunu basit AnalyzedKeywordData formatına çevir
      const fallbackResults: AnalyzedKeywordData[] = [];
      const keywordMap = new Map(tableData.map(item => [item.Keyword, item]));
      
      for (const keyword of fallbackKeywords) {
        if (keywordMap.has(keyword)) {
          const originalData = keywordMap.get(keyword)!;
          fallbackResults.push({
            ...originalData,
            category: "Related Keywords",
            reason: `Found through similarity matching with "${searchTerm}"`,
            relevanceScore: 50, // Fallback için orta puan
          });
        }
      }
      
      return fallbackResults;
    }
  }

  /**
   * Mevcut keyword'lerden benzer olanları filtrele
   */
  static filterBySimilarKeywords(
    data: KeywordData[], 
    similarKeywords: string[]
  ): KeywordData[] {
    if (similarKeywords.length === 0) return data;
    
    return data.filter(item => {
      const keyword = String(item.Keyword || '').toLowerCase();
      return similarKeywords.some(similarKeyword => 
        keyword.includes(similarKeyword.toLowerCase()) ||
        similarKeyword.toLowerCase().includes(keyword)
      );
    });
  }
}
