import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { KeywordData, TitleSubtitleData } from '../types';

export class ExportUtils {
  /**
   * Debug: Veri formatını kontrol et
   */
  static debugDataFormat(data: KeywordData[] | TitleSubtitleData[]): void {
    if (data.length === 0) {
      console.log('Debug: Veri boş');
      return;
    }
    
    const firstRow = data[0];
    console.log('Debug: İlk satır veri tipleri:');
    
    Object.entries(firstRow).forEach(([key, value]) => {
      const isNumeric = this.isNumericColumn(key);
      console.log(`${key}: ${typeof value} = ${value} ${isNumeric ? '(sayısal sütun)' : ''}`);
    });
    
    // Sayısal sütunların örnek değerlerini kontrol et
    const numericColumns = Object.keys(firstRow).filter(key => this.isNumericColumn(key));
    console.log('Debug: Sayısal sütunlar:', numericColumns);
    
    numericColumns.forEach(column => {
      const values = data.slice(0, 5).map(row => row[column as keyof typeof row]);
      console.log(`${column} örnek değerleri:`, values);
    });
  }
  
  /**
   * Excel dosyası oluştur ve indir
   */
  static exportToExcel(
    data: KeywordData[] | TitleSubtitleData[],
    filename: string,
    sheetName: string = 'ASO Data'
  ): void {
    try {
      // Veriyi hazırla - sayısal değerleri doğru formatta tut
      const processedData = data.map(row => {
        const processedRow: any = {};
        
        Object.entries(row).forEach(([key, value]) => {
          // Sayısal sütunlar için özel işlem
          if (this.isNumericColumn(key)) {
            const numericValue = this.ensureNumericValue(value);
            // Sayısal değeri kesinlikle number olarak tut
            processedRow[key] = numericValue;
          } else {
            processedRow[key] = value;
          }
        });
        
        return processedRow;
      });
      
      // Headers'ı al
      const headers = Object.keys(processedData[0] || {});
      
      // 2D array oluştur (header + data)
      const worksheetData = [
        headers, // İlk satır header
        ...processedData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Sayısal sütunlar için number olarak tut
            if (this.isNumericColumn(header)) {
              return this.ensureNumericValue(value);
            }
            return value;
          })
        )
      ];
      
      // Worksheet oluştur
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Sayısal sütunlar için format ayarları
      this.applyNumericFormats(ws, processedData);
      
      // Workbook oluştur
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Excel dosyasını buffer olarak oluştur
      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true,
        compression: true
      });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Dosyayı indir
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fullFilename = `${filename}_${timestamp}.xlsx`;
      saveAs(blob, fullFilename);
      
    } catch (error) {
      console.error('Excel export error:', error);
      throw new Error('Excel dosyası oluşturulamadı');
    }
  }
  
  /**
   * Sayısal sütun olup olmadığını kontrol et
   */
  private static isNumericColumn(columnName: string): boolean {
    const numericColumns = [
      'Volume', 
      'Difficulty', 
      'Growth (Max Reach)', 
      'Max. Reach', 
      'No. of results',
      'Title_Length',
      'Subtitle_Length', 
      'Keywords_Length',
      'Total_Volume',
      'Total_Difficulty',
      'Average_Volume',
      'Average_Difficulty',
      'Matched_Keywords_Count'
    ];
    return numericColumns.includes(columnName);
  }
  
  /**
   * Değeri sayısal formatta tut
   */
  private static ensureNumericValue(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    try {
      if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
      }
      
      // String ise temizle ve parse et
      if (typeof value === 'string') {
        const cleaned = value.replace(/,/g, '').replace(/%/g, '').replace(/\s/g, '').trim();
        if (cleaned === '' || cleaned === '-') {
          return 0;
        }
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
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
   * Sayısal sütunlar için format ayarları uygula
   */
  private static applyNumericFormats(ws: XLSX.WorkSheet, data: any[]): void {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const numericColumns: { [key: string]: number } = {};
    
    // Sayısal sütunların indekslerini bul
    headers.forEach((header, index) => {
      if (this.isNumericColumn(header)) {
        numericColumns[header] = index;
      }
    });
    
    // Her sayısal sütun için format ayarla
    Object.entries(numericColumns).forEach(([columnName, colIndex]) => {
      const colLetter = XLSX.utils.encode_col(colIndex);
      
      // Sütun genişliği ayarla
      if (!ws['!cols']) ws['!cols'] = [];
      ws['!cols'][colIndex] = { width: 15 };
      
      // Her hücre için sayısal format uygula (header'dan sonraki satırlar)
      data.forEach((row, rowIndex) => {
        const cellAddress = `${colLetter}${rowIndex + 2}`; // +2 çünkü header var ve Excel 1'den başlar
        const cellValue = row[columnName];
        
        // Sayısal değeri kesinlikle number olarak ayarla
        const numericValue = this.ensureNumericValue(cellValue);
        
        // Hücreyi oluştur veya güncelle
        ws[cellAddress] = {
          v: numericValue, // value
          t: 'n', // type: number
          z: '#,##0' // format: number with thousands separator
        };
      });
    });
  }
  
  /**
   * CSV dosyası oluştur ve indir
   */
  static exportToCsv(
    data: KeywordData[] | TitleSubtitleData[],
    filename: string
  ): void {
    try {
      if (data.length === 0) {
        throw new Error('Dışa aktarılacak veri yok');
      }
      
      // CSV başlıklarını oluştur
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Sayısal değerleri doğru formatta tut
            if (this.isNumericColumn(header)) {
              const numericValue = this.ensureNumericValue(value);
              return numericValue.toString();
            }
            // Virgül içeren değerleri tırnak içine al
            const stringValue = String(value || '');
            if (stringValue.includes(',')) {
              return `"${stringValue}"`;
            }
            return stringValue;
          }).join(',')
        )
      ].join('\n');
      
      // Blob oluştur
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Dosyayı indir
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fullFilename = `${filename}_${timestamp}.csv`;
      saveAs(blob, fullFilename);
      
    } catch (error) {
      console.error('CSV export error:', error);
      throw new Error('CSV dosyası oluşturulamadı');
    }
  }
  
  /**
   * Dosya adını güvenli hale getir
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }
  
  /**
   * Timestamp oluştur
   */
  static generateTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }
} 