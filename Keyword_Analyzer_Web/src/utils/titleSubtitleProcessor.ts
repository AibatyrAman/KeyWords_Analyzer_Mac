import { KeywordData, TitleSubtitleData } from '../types';

// OpenAI API configuration
const OPENAI_API_KEY = "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";

// Banned words list
const BANNED_WORDS = [
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
  "yourself", "yourselves"
];

interface WordFrequency {
  word: string;
  frequency: number;
}

interface MatchedKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
}

export class TitleSubtitleProcessor {
  
  // Step 1: Filter data by Volume and Difficulty
  static filterKVDData(data: KeywordData[], difficultyLimit: number): KeywordData[] {
    return data
      .filter(item => item.Volume >= 20 && item.Difficulty <= difficultyLimit)
      .sort((a, b) => b.Volume - a.Volume);
  }

  // Step 2: Generate word frequency from keywords
  static generateWordFrequency(data: KeywordData[]): WordFrequency[] {
    const wordCount: Record<string, number> = {};
    
    data.forEach(item => {
      const words = item.Keyword.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word) {
          wordCount[word] = (wordCount[word] || 0) + 1;
        }
      });
    });

    return Object.entries(wordCount)
      .map(([word, frequency]) => ({ word, frequency }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  // Step 3: Remove branded words using OpenAI
  static async removeBrandedWords(wordFrequencies: WordFrequency[]): Promise<WordFrequency[]> {
    try {
      const words = wordFrequencies.map(wf => wf.word);
      
      const systemPrompt = `
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
- Only include the branded words and proper nouns in the returned list, and avoid any other words.`;

      const userPrompt = `
Here is the list of words:
${words}

Return the list of branded words and proper nouns in the following format:
["word1", "word2", "word3"]
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0,
          max_tokens: 150
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
      
      let brandedWords: string[] = [];
      try {
        brandedWords = JSON.parse(answer);
      } catch {
        // Manual parsing if JSON fails
        const cleaned = answer.replace(/[[\]"]/g, '').trim();
        brandedWords = cleaned.split(',').map((w: string) => w.trim().toLowerCase()).filter((w: string) => w);
      }

      // Filter out branded words and banned words
      return wordFrequencies.filter(wf => 
        !brandedWords.includes(wf.word.toLowerCase()) && 
        !BANNED_WORDS.includes(wf.word.toLowerCase())
      );

    } catch (error) {
      console.error('Error removing branded words:', error);
      // Return original data if API fails
      return wordFrequencies.filter(wf => !BANNED_WORDS.includes(wf.word.toLowerCase()));
    }
  }

  // Step 4: Remove suffixes using OpenAI
  static async removeSuffixes(wordFrequencies: WordFrequency[], selectedCountry: string): Promise<WordFrequency[]> {
    try {
      const words = wordFrequencies.map(wf => wf.word);
      
      const systemPrompt = `
You are an expert in language processing. Your task is:
1. Given a Python list of keywords in the language relevant to the market of ${selectedCountry},
2. Remove only the plural suffixes from each word to return the singular/base form. For example, if the keywords are in English (as in the ${selectedCountry} market when applicable), remove plural suffixes such as -s, -es, and -ies. If the keywords are in another language, apply the appropriate plural suffix removal rules according to the language conventions of ${selectedCountry}.
3. If a word does not end with any of these plural suffixes, leave it unchanged.
4. Provide the final answer strictly as a Python list of strings.
Example:
- Input: ["cats", "boxes", "stories", "apple"]
- Output: ["cat", "box", "story", "apple"]

**WARNING**: Only remove plural suffixes. Do not remove any other suffix or modify the word in any other way.`;

      const userPrompt = `
Here is the list of words:
${words}

Return the processed list in JSON list format. For example:
["word1","word2","word3"]
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0
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
      
      let baseForms: string[] = [];
      try {
        // Clean up the response
        let cleanedAnswer = answer;
        if (cleanedAnswer.includes('```json')) {
          cleanedAnswer = cleanedAnswer.split('```json')[1].split('```')[0];
        } else if (cleanedAnswer.includes('```python')) {
          cleanedAnswer = cleanedAnswer.split('```python')[1].split('```')[0];
        }
        cleanedAnswer = cleanedAnswer.trim();
        
        baseForms = JSON.parse(cleanedAnswer);
      } catch {
        console.error('Error parsing suffix removal response');
        return wordFrequencies; // Return original if parsing fails
      }

      // Aggregate frequencies for same base forms
      const aggregated: Record<string, number> = {};
      baseForms.forEach((baseForm, index) => {
        if (index < wordFrequencies.length) {
          aggregated[baseForm] = (aggregated[baseForm] || 0) + wordFrequencies[index].frequency;
        }
      });

      return Object.entries(aggregated)
        .map(([word, frequency]) => ({ word, frequency }))
        .sort((a, b) => b.frequency - a.frequency);

    } catch (error) {
      console.error('Error removing suffixes:', error);
      return wordFrequencies; // Return original if API fails
    }
  }

  // Step 5: Generate Title and Subtitle using OpenAI
  static async generateTitleSubtitle(
    wordFrequencies: WordFrequency[], 
    appName: string, 
    selectedCountry: string
  ): Promise<TitleSubtitleData[]> {
    try {
      const topKeywords = wordFrequencies.map(wf => wf.word);
      
      const systemPrompt = `
You are an experienced ASO (App Store Optimization) expert. Your task is to generate optimized Title and Subtitle for an app based on the provided keyword data, taking into account the market characteristics of the selected country: **${selectedCountry}**.
I will provide you with a list of keywords sorted by frequency. Based on this information, your task is to generate the most optimized Title and Subtitle for an app's App Store page for the ${selectedCountry} market. Here are the detailed rules:

1. **Title**:
- Must include the app name: **${appName}**
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
- *Only generate 5 title and 5 subtitle*`;

      const userPrompt = `
Here are the most frequent keywords:
${topKeywords.join(',')}
- **The title and subtitle must be no longer than 30 characters and no shorter than 25 characters.**
- **Do not include any of the following words like: "and", "or", "your", "my", "with".**
- *Only generate 5 title and 5 subtitle*
**Provide the output strictly in the following JSON format:**
{
"data": [
    {"Title": "Generated Title", "Subtitle": "Generated Subtitle"},
    {"Title": "Generated Title", "Subtitle": "Generated Subtitle"},
    {"Title": "Generated Title", "Subtitle": "Generated Subtitle"},
    {"Title": "Generated Title", "Subtitle": "Generated Subtitle"},
    {"Title": "Generated Title", "Subtitle": "Generated Subtitle"}
]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 539
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
      
      let parsedData: any;
      try {
        // Extract JSON from response
        const jsonMatch = answer.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : answer;
        parsedData = JSON.parse(jsonText);
      } catch {
        throw new Error('Failed to parse OpenAI response');
      }

      const titleSubtitleData: TitleSubtitleData[] = [];
      
      parsedData.data.forEach((item: any, index: number) => {
        const title = item.Title;
        const subtitle = item.Subtitle;
        
        // Calculate unused keywords
        const titleWords = new Set(title.toLowerCase().split(/\s+/));
        const subtitleWords = new Set(subtitle.toLowerCase().split(/\s+/));
        const usedWords = new Set(Array.from(titleWords).concat(Array.from(subtitleWords)));
        
        const unusedKeywords = topKeywords.filter(keyword => 
          !usedWords.has(keyword.toLowerCase())
        );
        
        const keywordsString = unusedKeywords.slice(0, 10).join(','); // Limit to first 10
        
        titleSubtitleData.push({
          Title: title,
          Subtitle: subtitle,
          Keywords: keywordsString,
          Title_Length: title.length,
          Subtitle_Length: subtitle.length,
          Keywords_Length: keywordsString.length,
          Total_Volume: 0, // Will be calculated in next step
          Total_Difficulty: 0, // Will be calculated in next step
          Average_Volume: 0, // Will be calculated in next step
          Average_Difficulty: 0, // Will be calculated in next step
          Matched_Keywords_Count: 0 // Will be calculated in next step
        });
      });

      return titleSubtitleData;

    } catch (error) {
      console.error('Error generating title subtitle:', error);
      throw error;
    }
  }

  // Step 6: Find matching keywords and calculate scores
  static findMatchingKeywords(
    titleSubtitleData: TitleSubtitleData[], 
    originalData: KeywordData[]
  ): { titleSubtitleData: TitleSubtitleData[], matchedKeywords: MatchedKeyword[] } {
    
    const matchedKeywords: MatchedKeyword[] = [];
    
    const updatedTitleSubtitleData = titleSubtitleData.map(item => {
      const titleWords = new Set(item.Title?.toLowerCase().split(/\s+/) || []);
      const subtitleWords = new Set(item.Subtitle?.toLowerCase().split(/\s+/) || []);
      const keywordsWords = new Set(item.Keywords?.toLowerCase().split(/,/) || []);
      
      const combinedWords = new Set(
        Array.from(titleWords)
          .concat(Array.from(subtitleWords))
          .concat(Array.from(keywordsWords))
      );
      
      let totalVolume = 0;
      let totalDifficulty = 0;
      let matchedCount = 0;
      
      originalData.forEach(row => {
        const keywordWords = new Set(row.Keyword.toLowerCase().split(/\s+/));
        
        // Check if all keyword words are in combined words
        const isMatch = Array.from(keywordWords).every(word => 
          Array.from(combinedWords).some(combinedWord => 
            combinedWord.includes(word) || word.includes(combinedWord)
          )
        );
        
        if (isMatch) {
          totalVolume += row.Volume;
          totalDifficulty += row.Difficulty;
          matchedCount++;
          
          matchedKeywords.push({
            keyword: row.Keyword,
            volume: row.Volume,
            difficulty: row.Difficulty
          });
        }
      });
      
      return {
        ...item,
        Total_Volume: totalVolume,
        Total_Difficulty: totalDifficulty,
        Average_Volume: matchedCount > 0 ? Math.round(totalVolume / matchedCount * 1000) / 1000 : 0,
        Average_Difficulty: matchedCount > 0 ? Math.round(totalDifficulty / matchedCount * 1000) / 1000 : 0,
        Matched_Keywords_Count: matchedCount
      };
    });
    
    return {
      titleSubtitleData: updatedTitleSubtitleData,
      matchedKeywords
    };
  }

  // Main processing function
  static async processTitleSubtitle(
    data: KeywordData[],
    appName: string,
    selectedCountry: string,
    difficultyLimit: number
  ): Promise<{ titleSubtitleData: TitleSubtitleData[], matchedKeywords: MatchedKeyword[] }> {
    
    // Validate inputs
    if (!data || data.length === 0) {
      throw new Error('No data provided for processing');
    }
    
    if (!appName || appName.trim() === '') {
      throw new Error('App name is required');
    }
    
    if (!selectedCountry || selectedCountry.trim() === '') {
      throw new Error('Country selection is required');
    }
    
    // Step 1: Filter KVD data
    const kvdData = this.filterKVDData(data, difficultyLimit);
    if (kvdData.length === 0) {
      throw new Error(`No data found with Volume >= 20 and Difficulty <= ${difficultyLimit}. Try increasing the difficulty limit.`);
    }
    
    // Step 2: Generate word frequency
    const wordFrequencies = this.generateWordFrequency(kvdData);
    if (wordFrequencies.length === 0) {
      throw new Error('No word frequencies could be generated from the data');
    }
    
    // Step 3: Remove branded words
    const withoutBranded = await this.removeBrandedWords(wordFrequencies);
    if (withoutBranded.length === 0) {
      throw new Error('No words remaining after removing branded words');
    }
    
    // Step 4: Remove suffixes
    const withoutSuffixes = await this.removeSuffixes(withoutBranded, selectedCountry);
    if (withoutSuffixes.length === 0) {
      throw new Error('No words remaining after removing suffixes');
    }
    
    // Step 5: Generate title and subtitle
    const titleSubtitleData = await this.generateTitleSubtitle(withoutSuffixes, appName, selectedCountry);
    if (titleSubtitleData.length === 0) {
      throw new Error('Failed to generate title and subtitle data');
    }
    
    // Step 6: Find matching keywords and calculate scores
    const result = this.findMatchingKeywords(titleSubtitleData, data);
    
    return result;
  }
}
