import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Button,
  Chip,
  Stack,
  FormControlLabel,
  Checkbox,
  Slider,
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Remove,
  Close,
  FilterList,
} from '@mui/icons-material';
import { useAppStore } from '../store';
import { KeywordData } from '../types';

interface FilterPanelProps {
  data: KeywordData[] | null;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ data }) => {
  const {
    filters,
    setColumnFilter,
    addSearchTerm,
    removeSearchTerm,
    addExcludeTerm,
    removeExcludeTerm,
    setFilterNonLatin,
    clearFilters,
    applyFilters,
  } = useAppStore();

  const [searchInput, setSearchInput] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, { min: number; max: number; display: string; originalMin: number; originalMax: number }>>({});
  
  // Geçici filtre state'leri
  const [tempSearchTerms, setTempSearchTerms] = useState<string[]>([]);
  const [tempExcludeTerms, setTempExcludeTerms] = useState<string[]>([]);
  const [tempFilterNonLatin, setTempFilterNonLatin] = useState(false);
  const [tempColumnFilters, setTempColumnFilters] = useState<Record<string, { min: number; max: number }>>({});

  // Sayısal sütunları bul ve filtreleri oluştur
  useEffect(() => {
    if (!data || data.length === 0) return;

    const numericColumns = ['Volume', 'Difficulty', 'Growth (Max Reach)'];
    const newColumnFilters: Record<string, { min: number; max: number; display: string; originalMin: number; originalMax: number }> = {};

    numericColumns.forEach(column => {
      const values = data
        .map(row => row[column as keyof KeywordData])
        .filter(val => typeof val === 'number' && !isNaN(val as number))
        .map(val => val as number);

      if (values.length > 0) {
        const originalMin = Math.min(...values);
        const originalMax = Math.max(...values);
        
        newColumnFilters[column] = {
          min: originalMin,
          max: originalMax,
          originalMin,
          originalMax,
          display: `${column}: ${originalMin} - ${originalMax}`,
        };
      }
    });

    setColumnFilters(newColumnFilters);
  }, [data]);

  // Filtreleri geçici state'lerden gerçek state'lere senkronize et
  useEffect(() => {
    setTempSearchTerms(filters.searchTerms);
    setTempExcludeTerms(filters.excludeTerms);
    setTempFilterNonLatin(filters.filterNonLatin);
    
    // Sütun filtrelerini senkronize et, ama sadece ilk yüklemede
    if (Object.keys(filters.columnFilters).length > 0 && Object.keys(tempColumnFilters).length === 0) {
      setTempColumnFilters(filters.columnFilters);
    }
  }, [filters, tempColumnFilters]);

  const handleSearchSubmit = () => {
    if (searchInput.trim()) {
      const term = searchInput.trim();
      if (!tempSearchTerms.includes(term)) {
        setTempSearchTerms([...tempSearchTerms, term]);
      }
      setSearchInput('');
    }
  };

  const handleExcludeSubmit = () => {
    if (searchInput.trim()) {
      const term = searchInput.trim();
      if (!tempExcludeTerms.includes(term)) {
        setTempExcludeTerms([...tempExcludeTerms, term]);
      }
      setSearchInput('');
    }
  };

  const handleColumnFilterChange = (column: string, newMin: number, newMax: number) => {
    const currentFilter = columnFilters[column];
    if (currentFilter) {
      const newFilter = {
        ...currentFilter,
        min: newMin,
        max: newMax,
        display: `${column}: ${newMin} - ${newMax}`,
      };
      
      setColumnFilters(prev => ({
        ...prev,
        [column]: newFilter,
      }));
      
      // Geçici sütun filtrelerini güncelle
      setTempColumnFilters(prev => ({
        ...prev,
        [column]: { min: newMin, max: newMax },
      }));
    }
  };

  const handleApplyFilters = () => {
    // Önce mevcut filtreleri temizle
    clearFilters();
    
    // Geçici filtreleri gerçek filtre state'lerine aktar
    tempSearchTerms.forEach(term => addSearchTerm(term));
    tempExcludeTerms.forEach(term => addExcludeTerm(term));
    setFilterNonLatin(tempFilterNonLatin);
    
    // Sütun filtrelerini uygula
    Object.entries(tempColumnFilters).forEach(([column, filter]) => {
      setColumnFilter(column, filter.min, filter.max);
    });
    
    // Filtreleri uygula
    setTimeout(() => {
      applyFilters();
    }, 100);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterList />
        Filtre Ayarları
      </Typography>

      {/* Sütun Filtreleri */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            📊 Sütun Filtreleri
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {Object.keys(columnFilters).length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Veriler yüklendikten sonra sütun filtreleri burada görünecek
            </Typography>
          ) : (
            <Stack spacing={2}>
              {Object.entries(columnFilters).map(([column, filter]) => {
                const tempFilter = tempColumnFilters[column];
                const currentMin = tempFilter ? tempFilter.min : filter.min;
                const currentMax = tempFilter ? tempFilter.max : filter.max;
                
                return (
                  <Box key={column}>
                    <Typography variant="body2" color="primary" fontWeight="bold" gutterBottom>
                      {`${column}: ${currentMin} - ${currentMax}`}
                    </Typography>
                    <Slider
                      value={[currentMin, currentMax]}
                      onChange={(_, value) => {
                        if (Array.isArray(value)) {
                          handleColumnFilterChange(column, value[0], value[1]);
                        }
                      }}
                      min={filter.originalMin}
                      max={filter.originalMax}
                      valueLabelDisplay="auto"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                );
              })}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Keyword Arama */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            🔍 Keyword Arama
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Örn: ai, photo, music"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
              />
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleSearchSubmit}
                size="small"
              >
                Ekle
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Remove />}
                onClick={handleExcludeSubmit}
                size="small"
              >
                Çıkar
              </Button>
            </Box>

            {/* Arama Terimleri */}
            <Box>
              <Typography variant="body2" color="primary" fontWeight="bold" gutterBottom>
                🏷️ Arama Terimleri:
              </Typography>
              
              {tempSearchTerms.length === 0 && tempExcludeTerms.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Henüz arama terimi eklenmedi
                </Typography>
              ) : (
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {/* Dahil edilecek terimler */}
                  {tempSearchTerms.map((term, index) => (
                    <Chip
                      key={`include-${index}`}
                      label={term}
                      color="primary"
                      size="small"
                      onDelete={() => setTempSearchTerms(tempSearchTerms.filter(t => t !== term))}
                      icon={<Add />}
                    />
                  ))}
                  
                  {/* Çıkarılacak terimler */}
                  {tempExcludeTerms.map((term, index) => (
                    <Chip
                      key={`exclude-${index}`}
                      label={term}
                      color="error"
                      size="small"
                      onDelete={() => setTempExcludeTerms(tempExcludeTerms.filter(t => t !== term))}
                      icon={<Remove />}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Diğer Filtreler */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            ⚙️ Diğer Filtreler
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={tempFilterNonLatin}
                  onChange={(e) => setTempFilterNonLatin(e.target.checked)}
                  color="warning"
                />
              }
              label="Latin Harici Alfabeleri Çıkar"
            />
            
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                clearFilters();
                setTempSearchTerms([]);
                setTempExcludeTerms([]);
                setTempFilterNonLatin(false);
                
                // Sütun filtrelerini orijinal değerlere sıfırla
                const resetColumnFilters: Record<string, { min: number; max: number }> = {};
                Object.entries(columnFilters).forEach(([column, filter]) => {
                  resetColumnFilters[column] = { min: filter.originalMin, max: filter.originalMax };
                });
                setTempColumnFilters(resetColumnFilters);
              }}
              startIcon={<Close />}
            >
              Tüm Filtreleri Temizle
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>
      
      {/* Filtreleri Uygula Butonu */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleApplyFilters}
          fullWidth
          size="large"
          sx={{ 
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}
        >
          🔍 Filtreleri Uygula
        </Button>
      </Box>
    </Box>
  );
}; 