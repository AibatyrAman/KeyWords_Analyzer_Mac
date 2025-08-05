import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { KeywordData, TitleSubtitleData } from '../types';

export class ExportUtils {
  /**
   * Excel dosyası oluştur ve indir
   */
  static exportToExcel(
    data: KeywordData[] | TitleSubtitleData[],
    filename: string,
    sheetName: string = 'ASO Data'
  ): void {
    try {
      // Worksheet oluştur
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Workbook oluştur
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Excel dosyasını buffer olarak oluştur
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
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