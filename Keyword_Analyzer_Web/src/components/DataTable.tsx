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

  // Filtrelenmiş ve sıralanmış veri
  const processedData = useMemo(() => {
    if (!data) return [];

    let filteredData = [...data];

    // Sütun filtreleri uygula
    Object.entries(filters.columnFilters).forEach(([column, filter]) => {
      filteredData = filteredData.filter(row => {
        const value = row[column as keyof KeywordData];
        if (typeof value === 'number') {
          return value >= filter.min && value <= filter.max;
        }
        return true;
      });
    });

    // Keyword arama filtreleri
    if (filters.searchTerms.length > 0) {
      filteredData = filteredData.filter(row => {
        const keyword = row.Keyword.toLowerCase();
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
        const keyword = row.Keyword.toLowerCase();
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
        return isLatinOnly(row.Keyword);
      });
    }

    // Sıralama
    if (sortColumn) {
      filteredData.sort((a, b) => {
        const aValue = a[sortColumn as keyof KeywordData];
        const bValue = b[sortColumn as keyof KeywordData];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

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
      const sanitizedFilename = ExportUtils.sanitizeFilename(exportFilename);
      ExportUtils.exportToExcel(processedData, sanitizedFilename);
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

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

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
                        formatCellValue(row[header as keyof KeywordData])
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
            Ortalama Volume: {Math.round(processedData.reduce((sum, row) => sum + row.Volume, 0) / processedData.length)} | 
            Ortalama Difficulty: {Math.round(processedData.reduce((sum, row) => sum + row.Difficulty, 0) / processedData.length)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}; 