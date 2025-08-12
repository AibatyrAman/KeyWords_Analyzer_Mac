import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  Stack,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Download,
  TableChart,
} from '@mui/icons-material';
import { useAppStore } from '../store';
import { KeywordData } from '../types';
import { ExportUtils } from '../utils/exportUtils';

interface DataTableProps {
  data: KeywordData[] | null;
  title: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, title }) => {
  const {
    sortColumn,
    sortDirection,
    setSortColumn,
    setSortDirection,
    filters,
    setSuccess,
    setError,
  } = useAppStore();

  const [exportFilename, setExportFilename] = React.useState('aso_table');
  const [exportLocation, setExportLocation] = React.useState<'finder' | 'desktop' | 'project' | 'both'>('finder');

  // Latin alfabesi kontrol fonksiyonu
  const isLatinOnly = (keyword: string): boolean => {
    if (!keyword) return true;
    const letters = keyword.replace(/[^a-zA-Z]/g, '');
    if (!letters) return true;
    return /^[a-zA-Z\s]+$/.test(letters);
  };

  // Sayısal değer kontrolü
  const isNumericColumn = (column: string): boolean => {
    // Dinamik sütun kontrolü - store'dan columnInfo'yu al
    const { columnInfo } = useAppStore();
    const columnData = columnInfo.find(col => col.name === column);
    
    if (columnData) {
      return columnData.type === 'number' || columnData.type === 'percentage';
    }
    
    // Geriye uyumluluk için eski kontrol
    const numericColumns = ['Volume', 'Difficulty', 'Growth (Max Reach)', 'Max. Reach', 'No. of results', 'Title_Length', 'Subtitle_Length', 'Keywords_Length', 'Total_Volume', 'Total_Difficulty', 'Average_Volume', 'Average_Difficulty', 'Matched_Keywords_Count'];
    return numericColumns.includes(column);
  };

  // Boolean sütun kontrolü
  const isBooleanColumn = (column: string): boolean => {
    const { columnInfo } = useAppStore();
    const columnData = columnInfo.find(col => col.name === column);
    return columnData?.type === 'boolean';
  };

  // Güvenli sayı dönüşümü
  const safeNumberConversion = (value: any): number => {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    try {
      if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
      }
      
      const stringValue = String(value);
      const cleaned = stringValue.replace(/,/g, '').replace(/%/g, '').replace(/\s/g, '').trim();
      if (cleaned === '' || cleaned === '-') {
        return 0;
      }
      
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  };

  // Filtrelenmiş ve sıralanmış veri
  const processedData = useMemo(() => {
    if (!data) return [];

    let filteredData = [...data];

    // Sütun filtreleri uygula
    Object.entries(filters.columnFilters).forEach(([column, filter]) => {
      filteredData = filteredData.filter(row => {
        const value = row[column as keyof KeywordData];
        const numericValue = safeNumberConversion(value);
        
        // Sayısal sütunlar için range kontrolü
        if (isNumericColumn(column)) {
          return numericValue >= filter.min && numericValue <= filter.max;
        }
        
        // String sütunlar için string kontrolü
        const stringValue = String(value || '').toLowerCase();
        return stringValue.includes(String(filter.min).toLowerCase()) || 
               stringValue.includes(String(filter.max).toLowerCase());
      });
    });

    // Keyword arama filtreleri
    if (filters.searchTerms.length > 0) {
      filteredData = filteredData.filter(row => {
        const keyword = String(row.Keyword || '').toLowerCase();
        return filters.searchTerms.some(term => {
          const termLower = term.toLowerCase();
          return keyword.includes(termLower) || 
                 keyword.startsWith(termLower) || 
                 keyword.endsWith(termLower);
        });
      });
    }

    // Çıkarılacak kelimeler filtresi
    if (filters.excludeTerms.length > 0) {
      filteredData = filteredData.filter(row => {
        const keyword = String(row.Keyword || '').toLowerCase();
        return !filters.excludeTerms.some(term => {
          const termLower = term.toLowerCase();
          return keyword.includes(termLower) || 
                 keyword.startsWith(termLower) || 
                 keyword.endsWith(termLower);
        });
      });
    }

    // Latin alfabesi filtresi
    if (filters.filterNonLatin) {
      filteredData = filteredData.filter(row => {
        return isLatinOnly(String(row.Keyword || ''));
      });
    }

    // Sıralama
    if (sortColumn) {
      filteredData.sort((a, b) => {
        const aValue = a[sortColumn as keyof KeywordData];
        const bValue = b[sortColumn as keyof KeywordData];

        // Sayısal sütunlar için sayısal sıralama
        if (isNumericColumn(sortColumn)) {
          const aNum = safeNumberConversion(aValue);
          const bNum = safeNumberConversion(bValue);
          
          if (sortDirection === 'asc') {
            return aNum - bNum;
          } else {
            return bNum - aNum;
          }
        }

        // String sütunlar için string sıralama
        const aStr = String(aValue || '');
        const bStr = String(bValue || '');
        
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return filteredData;
  }, [data, filters, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    if (!processedData || processedData.length === 0) {
      setError('Dışa aktarılacak veri yok');
      return;
    }

    try {
      // Export öncesi veriyi kontrol et ve sayısal değerleri düzelt
      const exportData = processedData.map(row => {
        const cleanRow: any = {};
        Object.entries(row).forEach(([key, value]) => {
          // Sayısal sütunlar için özel kontrol
          if (isNumericColumn(key)) {
            cleanRow[key] = safeNumberConversion(value);
          } else {
            cleanRow[key] = value;
          }
        });
        return cleanRow;
      });

      const sanitizedFilename = ExportUtils.sanitizeFilename(exportFilename);
      const { columnInfo } = useAppStore();
      ExportUtils.exportToExcel(exportData, sanitizedFilename, 'ASO Data', columnInfo);
      setSuccess(`Excel dosyası başarıyla indirildi: ${sanitizedFilename}`);
    } catch (error) {
      setError(`Export hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  };

  const getColumnHeaders = () => {
    if (!processedData || processedData.length === 0) return [];
    
    const firstRow = processedData[0];
    return Object.keys(firstRow);
  };

  const formatCellValue = (value: any, columnName?: string): string => {
    if (value === null || value === undefined) return '-';
    
    // Boolean değerler için özel formatlama
    if (columnName && isBooleanColumn(columnName)) {
      if (typeof value === 'boolean') {
        return value ? '✅ True' : '❌ False';
      }
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') {
          return '✅ True';
        }
        if (lower === 'false' || lower === '0' || lower === 'no') {
          return '❌ False';
        }
      }
      return String(value);
    }
    
    // Sayısal değerler için özel formatlama
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    // String sayıları da kontrol et
    const numericValue = safeNumberConversion(value);
    if (numericValue !== 0 || String(value).trim() === '0') {
      return numericValue.toLocaleString();
    }
    
    return String(value);
  };

  // Güvenli ortalama hesaplama
  const calculateSafeAverage = (values: number[]): number => {
    if (values.length === 0) return 0;
    
    const validValues = values.filter(v => !isNaN(v) && isFinite(v));
    if (validValues.length === 0) return 0;
    
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    return sum / validValues.length;
  };

  // Ortalama hesaplamaları
  const averageVolume = useMemo(() => {
    if (!processedData || processedData.length === 0) return 0;
    const volumes = processedData.map(row => safeNumberConversion(row.Volume));
    return calculateSafeAverage(volumes);
  }, [processedData]);

  const averageDifficulty = useMemo(() => {
    if (!processedData || processedData.length === 0) return 0;
    const difficulties = processedData.map(row => safeNumberConversion(row.Difficulty));
    return calculateSafeAverage(difficulties);
  }, [processedData]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableChart />
          {title}
        </Typography>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {processedData.length} kayıt
          </Typography>
          
          {/* Export Controls */}
          <TextField
            size="small"
            label="Dosya Adı"
            value={exportFilename}
            onChange={(e) => setExportFilename(e.target.value)}
            sx={{ width: 150 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Kaydetme Yeri</InputLabel>
            <Select
              value={exportLocation}
              label="Kaydetme Yeri"
              onChange={(e) => setExportLocation(e.target.value as any)}
            >
              <MenuItem value="finder">🔍 Finder ile Seç</MenuItem>
              <MenuItem value="desktop">🖥️ Masaüstü</MenuItem>
              <MenuItem value="project">📁 Proje Klasörü</MenuItem>
              <MenuItem value="both">📁 Her İkisi</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={!processedData || processedData.length === 0}
          >
            📥 Excel İndir
          </Button>
          
          {/* Debug butonu - sadece development'ta görünür */}
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                const { columnInfo } = useAppStore();
                ExportUtils.debugDataFormat(processedData, columnInfo);
                console.log('Debug: Export öncesi veri kontrol edildi');
              }}
              disabled={!processedData || processedData.length === 0}
            >
              🐛 Debug
            </Button>
          )}
        </Stack>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {getColumnHeaders().map((header) => (
                <TableCell
                  key={header}
                  sortDirection={sortColumn === header ? sortDirection : false}
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                >
                  <TableSortLabel
                    active={sortColumn === header}
                    direction={sortColumn === header ? sortDirection : 'asc'}
                    onClick={() => handleSort(header)}
                    sx={{ color: 'white', '&.MuiTableSortLabel-active': { color: 'white' } }}
                  >
                    {header}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {processedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={getColumnHeaders().length} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Veri bulunamadı
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              processedData.map((row, index) => (
                <TableRow key={index} hover>
                  {getColumnHeaders().map((header) => (
                    <TableCell key={header}>
                      {header === 'Category' ? (
                        <Chip
                          label={row[header as keyof KeywordData]}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        formatCellValue(row[header as keyof KeywordData], header)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      {processedData.length > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Toplam: {processedData.length} kayıt | 
            Ortalama Volume: {Math.round(averageVolume)} | 
            Ortalama Difficulty: {Math.round(averageDifficulty)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}; 