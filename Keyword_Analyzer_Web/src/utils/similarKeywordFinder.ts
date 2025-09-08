import { KeywordData } from '../types';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY ;

export class SimilarKeywordFinder {
  
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
- Return results as a JSON array of strings

Examples:
Search term: "weather"
Possible matches: "weather", "weater", "wether", "weather app", "weather forecast", "climate", "temperature"

Search term: "photo"
Possible matches: "photo", "foto", "photography", "photo editor", "photo filter", "image", "picture"
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

Return the most relevant keywords as a JSON array, ordered by relevance:
`;

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
          max_tokens: 1000
        })
      });

      // Check if response is successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API hatası: ${response.status}. Lütfen tekrar deneyin.`);
      }

      const result = await response.json();
      
      // Check if response is valid
      if (!result.choices || !result.choices[0] || !result.choices[0].message || !result.choices[0].message.content) {
        console.error('Invalid OpenAI response:', result);
        throw new Error('OpenAI API yanıtı geçersiz. Lütfen tekrar deneyin.');
      }
      
      const answer = result.choices[0].message.content.trim();
      
      let similarKeywords: string[] = [];
      try {
        // Extract JSON from response
        const jsonMatch = answer.match(/\[.*\]/);
        if (jsonMatch) {
          similarKeywords = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: try to parse the entire response
          similarKeywords = JSON.parse(answer);
        }
        
        // Validate that all returned keywords exist in the original list
        similarKeywords = similarKeywords.filter(keyword => 
          availableKeywords.includes(keyword)
        );
        
        // Limit to maxResults
        similarKeywords = similarKeywords.slice(0, maxResults);
        
      } catch (parseError) {
        console.error('Error parsing similar keywords response:', parseError);
        // Fallback: use enhanced string matching
        similarKeywords = this.enhancedFallbackSimilarKeywords(searchTerm, availableKeywords, maxResults);
      }

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
   */
  static async findRelatedKeywordsFromTable(
    searchTerm: string,
    tableData: KeywordData[],
    maxResults: number = 100
  ): Promise<KeywordData[]> {
    try {
      const availableKeywords = tableData.map(item => item.Keyword).filter(Boolean) as string[];
      
      const systemPrompt = `
You are an expert in ASO (App Store Optimization) keyword analysis. Your task is to find ALL keywords from the provided list that are related to the search term for mobile app marketing.

Your analysis should prioritize:
1. **Direct Matches**: Keywords that exactly match or contain the search term
2. **Semantic Similarity**: Keywords with similar meaning or concept in app context
3. **Typo Detection**: Common misspellings and typos of the search term
4. **App-Related Variations**: Keywords that are variations relevant to mobile apps
5. **Contextual Relevance**: Keywords that make sense in mobile app context
6. **Related Concepts**: Keywords that are conceptually related to the search term

Analysis Rules:
- Focus on mobile app and ASO relevance
- Prioritize keywords that would be useful for app store optimization
- Consider app categories, features, and user intent
- Return only keywords that exist in the provided list
- Return maximum ${maxResults} keywords
- Return results as a JSON array of strings
- Order by relevance (most relevant first)

Examples:
Search term: "weather"
Good matches: "weather", "weather app", "weather forecast", "weather widget", "weather radar", "weather map", "climate", "temperature", "forecast"

Search term: "photo"
Good matches: "photo", "photo editor", "photo filter", "photo collage", "photo gallery", "photo manager", "camera", "image", "picture"

Search term: "UV"
Good matches: "UV", "UV index", "UV protection", "UV monitor", "UV tracker", "UV app", "sun", "ultraviolet", "skin cancer", "sunscreen"
`;

      const userPrompt = `
Search term: "${searchTerm}"

Available keywords to search within (${availableKeywords.length} total):
${availableKeywords.join(', ')}

Please analyze the search term "${searchTerm}" and find ALL related keywords from the above list for mobile app ASO purposes.

Focus on:
- Exact matches and variations
- App-related keywords that make sense in mobile context
- Keywords that would be useful for app store optimization
- Relevant typos and misspellings
- Semantically related terms in app context
- Conceptually related keywords

Return the most relevant keywords as a JSON array, ordered by relevance (most relevant first):
`;

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
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API hatası: ${response.status}. Lütfen tekrar deneyin.`);
      }

      const result = await response.json();
      
      if (!result.choices || !result.choices[0] || !result.choices[0].message || !result.choices[0].message.content) {
        console.error('Invalid OpenAI response:', result);
        throw new Error('OpenAI API yanıtı geçersiz. Lütfen tekrar deneyin.');
      }
      
      const answer = result.choices[0].message.content.trim();
      
      let relatedKeywords: string[] = [];
      try {
        // Extract JSON from response
        const jsonMatch = answer.match(/\[.*\]/);
        if (jsonMatch) {
          relatedKeywords = JSON.parse(jsonMatch[0]);
        } else {
          relatedKeywords = JSON.parse(answer);
        }
        
        // Validate that all returned keywords exist in the original list
        relatedKeywords = relatedKeywords.filter(keyword => 
          availableKeywords.includes(keyword)
        );
        
        // Limit to maxResults
        relatedKeywords = relatedKeywords.slice(0, maxResults);
        
      } catch (parseError) {
        console.error('Error parsing related keywords response:', parseError);
        // Fallback: use enhanced string matching
        relatedKeywords = this.enhancedFallbackSimilarKeywords(searchTerm, availableKeywords, maxResults);
      }

      // Return the actual KeywordData objects
      return tableData.filter(item => 
        relatedKeywords.includes(item.Keyword)
      );

    } catch (error) {
      console.error('Error finding related keywords:', error);
      // Fallback to enhanced matching if API fails
      const availableKeywords = tableData.map(item => item.Keyword).filter(Boolean) as string[];
      const fallbackKeywords = this.enhancedFallbackSimilarKeywords(searchTerm, availableKeywords, maxResults);
      return tableData.filter(item => 
        fallbackKeywords.includes(item.Keyword)
      );
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
