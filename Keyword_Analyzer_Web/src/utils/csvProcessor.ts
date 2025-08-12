import Papa from 'papaparse';
import { KeywordData, ColumnInfo } from '../types';

export class CsvProcessor {
  /**
   * CSV dosyasından sütun bilgilerini analiz et
   */
  static analyzeColumns(data: any[]): ColumnInfo[] {
    if (data.length === 0) return [];

    const columns = Object.keys(data[0]);
    const columnInfo: ColumnInfo[] = [];

    columns.forEach(columnName => {
      const values = data.map(row => row[columnName]);
      const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
      
      // Veri tipini belirle
      const type = this.determineColumnType(values);
      
      // Boolean değerleri kontrol et
      const booleanValues = type === 'boolean' ? 
        Array.from(new Set(values.filter(val => val === true || val === false))) as boolean[] : 
        undefined;

      // Sayısal değerler için min/max hesapla
      let min: number | undefined;
      let max: number | undefined;
      
      if (type === 'number' || type === 'percentage') {
        const numericValues = nonNullValues.map(val => this.convertToNumber(val));
        const validNumericValues = numericValues.filter(val => !isNaN(val) && isFinite(val));
        
        if (validNumericValues.length > 0) {
          min = Math.min(...validNumericValues);
          max = Math.max(...validNumericValues);
        }
      }

      // Benzersiz değerleri al (string sütunlar için)
      const uniqueValues = type === 'string' ? 
        Array.from(new Set(nonNullValues)) : 
        undefined;

      columnInfo.push({
        name: columnName,
        type,
        min,
        max,
        hasNulls: values.length !== nonNullValues.length,
        uniqueValues,
        booleanValues
      });
    });

    return columnInfo;
  }

  /**
   * Sütun tipini belirle
   */
  private static determineColumnType(values: any[]): 'string' | 'number' | 'boolean' | 'percentage' | 'date' {
    const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
    
    if (nonNullValues.length === 0) return 'string';

    // Boolean kontrolü
    const booleanCount = nonNullValues.filter(val => 
      val === true || val === false || 
      val === 'true' || val === 'false' ||
      val === 'True' || val === 'False'
    ).length;
    
    if (booleanCount === nonNullValues.length) return 'boolean';

    // Yüzde kontrolü
    const percentageCount = nonNullValues.filter(val => 
      typeof val === 'string' && val.includes('%')
    ).length;
    
    if (percentageCount > 0) return 'percentage';

    // Sayı kontrolü
    const numericCount = nonNullValues.filter(val => {
      if (typeof val === 'number') return !isNaN(val);
      if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '').replace(/%/g, '').replace(/\s/g, '').trim();
        return !isNaN(parseFloat(cleaned)) && cleaned !== '';
      }
      return false;
    }).length;

    if (numericCount === nonNullValues.length) return 'number';

    // Tarih kontrolü (basit)
    const dateCount = nonNullValues.filter(val => {
      if (typeof val === 'string') {
        // Basit tarih formatları kontrolü
        const datePatterns = [
          /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
          /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
          /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
        ];
        return datePatterns.some(pattern => pattern.test(val));
      }
      return false;
    }).length;

    if (dateCount > nonNullValues.length * 0.8) return 'date';

    return 'string';
  }

  /**
   * Veriyi dinamik olarak işle
   */
  static processDataDynamically(data: any[], columnInfo: ColumnInfo[], nullHandling: 'zero' | 'null' | 'exclude' = 'zero'): any[] {
    return data.map(row => {
      const processedRow: any = {};

      columnInfo.forEach(column => {
        const value = row[column.name];
        
        switch (column.type) {
          case 'number':
            processedRow[column.name] = this.convertToNumber(value);
            break;
          case 'percentage':
            processedRow[column.name] = this.convertPercentageToNumber(value);
            break;
          case 'boolean':
            processedRow[column.name] = this.convertToBoolean(value);
            break;
          case 'date':
            processedRow[column.name] = this.convertToDate(value);
            break;
          default:
            processedRow[column.name] = value;
        }

        // Null değerleri işle
        if (processedRow[column.name] === null || processedRow[column.name] === undefined) {
          switch (nullHandling) {
            case 'zero':
              processedRow[column.name] = column.type === 'string' ? '' : 0;
              break;
            case 'null':
              processedRow[column.name] = null;
              break;
            case 'exclude':
              // Bu satırı filtreleme sırasında çıkaracağız
              break;
          }
        }
      });

      return processedRow;
    });
  }

  /**
   * Yüzde değerini sayıya çevir
   */
  private static convertPercentageToNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    try {
      if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
      }

      if (typeof value === 'string') {
        const cleaned = value.replace(/,/g, '').replace(/\s/g, '').trim();
        if (cleaned === '' || cleaned === '-') {
          return 0;
        }
        
        // Yüzde işaretini kaldır ve parse et
        const withoutPercent = cleaned.replace(/%/g, '');
        const parsed = parseFloat(withoutPercent);
        return isNaN(parsed) ? 0 : parsed;
      }

      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Boolean değere çevir
   */
  private static convertToBoolean(value: any): boolean | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return false;
      }
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    return null;
  }

  /**
   * Tarih değerine çevir
   */
  private static convertToDate(value: any): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'string') {
      // Basit tarih formatı kontrolü
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
        /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      ];
      
      if (datePatterns.some(pattern => pattern.test(value))) {
        return value;
      }
    }

    return value;
  }

  /**
   * Tek klasördeki tüm CSV dosyalarını birleştirir
   */
  static async mergeNoDuplicateData(files: File[]): Promise<{ data: KeywordData[], columnInfo: ColumnInfo[] }> {
    const allData: KeywordData[] = [];
    let allColumnInfo: ColumnInfo[] = [];
    
    for (const file of files) {
      try {
        const rawData = await this.parseCsvFile(file);
        
        // İlk dosyadan sütun bilgilerini al
        if (allColumnInfo.length === 0) {
          allColumnInfo = this.analyzeColumns(rawData);
        }
        
        // Veriyi dinamik olarak işle
        const processedData = this.processDataDynamically(rawData, allColumnInfo);
        
        // Kategori bilgisini ekle
        const dataWithCategory = processedData.map(row => ({
          ...row,
          Category: this.extractCategoryFromFileName(file.name),
        }));
        
        allData.push(...dataWithCategory);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }
    
    return {
      data: allData.sort((a, b) => (b.Difficulty || 0) - (a.Difficulty || 0)),
      columnInfo: allColumnInfo
    };
  }
  
  /**
   * Tarih modu için çoklu klasör işleme
   */
  static async mergeWithDateData(folders: File[][]): Promise<{ data: KeywordData[], columnInfo: ColumnInfo[] }> {
    const allData: KeywordData[] = [];
    let allColumnInfo: ColumnInfo[] = [];
    
    for (const folder of folders) {
      const folderName = folder[0]?.webkitRelativePath?.split('/')[0] || 'unknown';
      const dateInfo = folderName.split('_')[0];
      
      for (const file of folder) {
        try {
          const rawData = await this.parseCsvFile(file);
          
          // İlk dosyadan sütun bilgilerini al
          if (allColumnInfo.length === 0) {
            allColumnInfo = this.analyzeColumns(rawData);
          }
          
          // Veriyi dinamik olarak işle
          const processedData = this.processDataDynamically(rawData, allColumnInfo);
          
          const dataWithCategory = processedData.map(row => ({
            ...row,
            Category: this.extractCategoryFromFileName(file.name),
            Date: dateInfo,
          }));
          
          allData.push(...dataWithCategory);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }
    }
    
    return {
      data: allData.sort((a, b) => (b.Difficulty || 0) - (a.Difficulty || 0)),
      columnInfo: allColumnInfo
    };
  }
  
  /**
   * Tek CSV dosyası işleme
   */
  static async processSingleCsvFile(file: File): Promise<{ data: KeywordData[], columnInfo: ColumnInfo[] }> {
    try {
      const rawData = await this.parseCsvFile(file);
      const columnInfo = this.analyzeColumns(rawData);
      const processedData = this.processDataDynamically(rawData, columnInfo);
      
      const dataWithCategory = processedData.map(row => ({
        ...row,
        Category: this.extractCategoryFromFileName(file.name),
      }));
      
      return {
        data: dataWithCategory.sort((a, b) => (b.Difficulty || 0) - (a.Difficulty || 0)),
        columnInfo
      };
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
      .filter(row => (row.Volume || 0) >= 20 && (row.Difficulty || 0) <= limit)
      .sort((a, b) => (b.Volume || 0) - (a.Volume || 0));
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
   * Herhangi bir değeri güvenli şekilde number'a çevir
   */
  private static convertToNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    try {
      // String ise temizle
      if (typeof value === 'string') {
        const cleaned = value.replace(/,/g, '').replace(/%/g, '').replace(/\s/g, '').trim();
        if (cleaned === '' || cleaned === '-') {
          return 0;
        }
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      // Number ise direkt döndür
      if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
      }
      
      // Diğer tipler için string'e çevir ve parse et
      const stringValue = String(value);
      const cleaned = stringValue.replace(/,/g, '').replace(/%/g, '').replace(/\s/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  }
  
  /**
   * Growth değerini integer'a çevir (geriye uyumluluk için)
   */
  private static convertGrowthToInt(growth: any): number {
    return this.convertToNumber(growth);
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