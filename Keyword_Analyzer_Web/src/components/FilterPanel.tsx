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
  } = useAppStore();

  const [searchInput, setSearchInput] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, { min: number; max: number; display: string }>>({});

  // Sayısal sütunları bul ve filtreleri oluştur
  useEffect(() => {
    if (!data || data.length === 0) return;

    const numericColumns = ['Volume', 'Difficulty', 'Growth (Max Reach)'];
    const newColumnFilters: Record<string, { min: number; max: number; display: string }> = {};

    numericColumns.forEach(column => {
      const values = data
        .map(row => row[column as keyof KeywordData])
        .filter(val => typeof val === 'number' && !isNaN(val as number))
        .map(val => val as number);

      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        newColumnFilters[column] = {
          min,
          max,
          display: `${column}: ${min} - ${max}`,
        };
      }
    });

    setColumnFilters(newColumnFilters);
  }, [data]);

  const handleSearchSubmit = () => {
    if (searchInput.trim()) {
      addSearchTerm(searchInput.trim());
      setSearchInput('');
    }
  };

  const handleExcludeSubmit = () => {
    if (searchInput.trim()) {
      addExcludeTerm(searchInput.trim());
      setSearchInput('');
    }
  };

  const handleColumnFilterChange = (column: string, value: number[], type: 'min' | 'max') => {
    const currentFilter = columnFilters[column];
    if (currentFilter) {
      const newFilter = {
        ...currentFilter,
        [type]: value[0],
        display: `${column}: ${type === 'min' ? value[0] : currentFilter.min} - ${type === 'max' ? value[0] : currentFilter.max}`,
      };
      
      setColumnFilters(prev => ({
        ...prev,
        [column]: newFilter,
      }));
      
      setColumnFilter(column, newFilter.min, newFilter.max);
    }
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
              {Object.entries(columnFilters).map(([column, filter]) => (
                <Box key={column}>
                  <Typography variant="body2" color="primary" fontWeight="bold" gutterBottom>
                    {filter.display}
                  </Typography>
                  <Slider
                    value={[filter.min, filter.max]}
                    onChange={(_, value) => {
                      if (Array.isArray(value)) {
                        handleColumnFilterChange(column, [value[0]], 'min');
                        handleColumnFilterChange(column, [value[1]], 'max');
                      }
                    }}
                    min={filter.min}
                    max={filter.max}
                    valueLabelDisplay="auto"
                    sx={{ mt: 1 }}
                  />
                </Box>
              ))}
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
              
              {filters.searchTerms.length === 0 && filters.excludeTerms.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Henüz arama terimi eklenmedi
                </Typography>
              ) : (
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {/* Dahil edilecek terimler */}
                  {filters.searchTerms.map((term, index) => (
                    <Chip
                      key={`include-${index}`}
                      label={term}
                      color="primary"
                      size="small"
                      onDelete={() => removeSearchTerm(term)}
                      icon={<Add />}
                    />
                  ))}
                  
                  {/* Çıkarılacak terimler */}
                  {filters.excludeTerms.map((term, index) => (
                    <Chip
                      key={`exclude-${index}`}
                      label={term}
                      color="error"
                      size="small"
                      onDelete={() => removeExcludeTerm(term)}
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
                  checked={filters.filterNonLatin}
                  onChange={(e) => setFilterNonLatin(e.target.checked)}
                  color="warning"
                />
              }
              label="Latin Harici Alfabeleri Çıkar"
            />
            
            <Button
              variant="outlined"
              color="error"
              onClick={clearFilters}
              startIcon={<Close />}
            >
              Tüm Filtreleri Temizle
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}; 