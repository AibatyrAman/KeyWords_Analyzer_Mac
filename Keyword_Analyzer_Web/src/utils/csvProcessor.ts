import Papa from 'papaparse';
import { KeywordData } from '../types';

export class CsvProcessor {
  /**
   * Tek klasördeki tüm CSV dosyalarını birleştirir
   */
  static async mergeNoDuplicateData(files: File[]): Promise<KeywordData[]> {
    const allData: KeywordData[] = [];
    
    for (const file of files) {
      try {
        const data = await this.parseCsvFile(file);
        
        // Growth sütununu integer'a çevir
        const processedData = data.map(row => ({
          ...row,
          'Growth (Max Reach)': this.convertGrowthToInt(row['Growth (Max Reach)']),
          Category: this.extractCategoryFromFileName(file.name),
        }));
        
        allData.push(...processedData);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }
    
    // Difficulty'ye göre azalan sıralama
    return allData.sort((a, b) => b.Difficulty - a.Difficulty);
  }
  
  /**
   * Tarih modu için çoklu klasör işleme
   */
  static async mergeWithDateData(folders: File[][]): Promise<KeywordData[]> {
    const allData: KeywordData[] = [];
    
    for (const folder of folders) {
      const folderName = folder[0]?.webkitRelativePath?.split('/')[0] || 'unknown';
      const dateInfo = folderName.split('_')[0];
      
      for (const file of folder) {
        try {
          const data = await this.parseCsvFile(file);
          
          const processedData = data.map(row => ({
            ...row,
            'Growth (Max Reach)': this.convertGrowthToInt(row['Growth (Max Reach)']),
            Category: this.extractCategoryFromFileName(file.name),
            Date: dateInfo,
          }));
          
          allData.push(...processedData);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }
    }
    
    // Difficulty'ye göre azalan sıralama
    return allData.sort((a, b) => b.Difficulty - a.Difficulty);
  }
  
  /**
   * Tek CSV dosyası işleme
   */
  static async processSingleCsvFile(file: File): Promise<KeywordData[]> {
    try {
      const data = await this.parseCsvFile(file);
      
      const processedData = data.map(row => ({
        ...row,
        'Growth (Max Reach)': this.convertGrowthToInt(row['Growth (Max Reach)']),
        Category: this.extractCategoryFromFileName(file.name),
      }));
      
      // Difficulty'ye göre azalan sıralama
      return processedData.sort((a, b) => b.Difficulty - a.Difficulty);
    } catch (error) {
      console.error(`Error processing single file ${file.name}:`, error);
      throw error;
    }
  }
  
  /**
   * KVD (Keyword, Volume, Difficulty) filtresi
   */
  static filterKVD(data: KeywordData[], limit: number): KeywordData[] {
    return data
      .filter(row => row.Volume >= 20 && row.Difficulty <= limit)
      .sort((a, b) => b.Volume - a.Volume);
  }
  
  /**
   * Kelime frekans analizi
   */
  static getWordFrequency(data: KeywordData[]): { word: string; frequency: number; category?: string }[] {
    const words = data
      .map(row => row.Keyword)
      .join(' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    const frequencyMap = new Map<string, number>();
    words.forEach(word => {
      const normalized = word.toLowerCase();
      frequencyMap.set(normalized, (frequencyMap.get(normalized) || 0) + 1);
    });
    
    const result = Array.from(frequencyMap.entries())
      .map(([word, frequency]) => ({
        word,
        frequency,
        category: data[0]?.Category || 'Frequency',
      }))
      .sort((a, b) => b.frequency - a.frequency);
    
    return result;
  }
  
  /**
   * Branded kelimeleri filtrele
   */
  static filterBrandedWords(frequencyData: { word: string; frequency: number; category?: string }[]): { word: string; frequency: number; category?: string }[] {
    const stopWords = [
      'free', 'new', 'best', 'top', 'iphone', 'ipad', 'android', 'google', 'store',
      'download', 'downloads', 'for', 'apple', 'with', 'yours', 'a', 'about', 'above', 'after', 'again', 'against', 'all',
      'am', 'an', 'and', 'any', 'app', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
      'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t',
      'doing', 'don\'t', 'down', 'during', 'each', 'few', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have',
      'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself',
      'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its',
      'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
      'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d',
      'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
      'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this',
      'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re',
      'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s',
      'whom', 'why', 'why\'s', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours',
      'yourself', 'yourselves'
    ];
    
    return frequencyData.filter(item => {
      const word = item.word.toLowerCase();
      return !stopWords.includes(word);
    });
  }
  
  /**
   * Çoğul eklerini kaldır
   */
  static removeSuffixes(frequencyData: { word: string; frequency: number; category?: string }[]): { word: string; frequency: number; category?: string }[] {
    return frequencyData.map(item => {
      let word = item.word.toLowerCase();
      
      // Basit çoğul ek kaldırma kuralları
      if (word.endsWith('ies')) {
        word = word.slice(0, -3) + 'y';
      } else if (word.endsWith('es')) {
        word = word.slice(0, -2);
      } else if (word.endsWith('s')) {
        word = word.slice(0, -1);
      }
      
      return {
        ...item,
        word,
      };
    });
  }
  
  /**
   * CSV dosyasını parse et
   */
  private static async parseCsvFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }
  
  /**
   * Growth değerini integer'a çevir
   */
  private static convertGrowthToInt(growth: any): number {
    if (!growth || growth === '') {
      return 0;
    }
    
    try {
      const cleaned = String(growth).replace(/,/g, '').replace(/%/g, '').trim();
      return parseInt(cleaned, 10);
    } catch {
      return 0;
    }
  }
  
  /**
   * Dosya adından kategori çıkar
   */
  private static extractCategoryFromFileName(fileName: string): string {
    const nameWithoutExt = fileName.replace('.csv', '');
    const parts = nameWithoutExt.split('-');
    
    if (parts.length >= 4 && parts[0] === 'trending' && parts[1] === 'keywords') {
      return parts.slice(3).join('-');
    } else {
      return parts[parts.length - 1] || nameWithoutExt;
    }
  }
} 