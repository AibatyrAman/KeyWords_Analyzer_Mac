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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  RadioGroup,
  Radio,
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Remove,
  Close,
  FilterList,
} from '@mui/icons-material';
import { useAppStore } from '../store';
import { KeywordData, ColumnInfo } from '../types';

interface FilterPanelProps {
  data: KeywordData[] | null;
  columnInfo: ColumnInfo[];
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ data, columnInfo }) => {
  const {
    filters,
    setColumnFilter,
    setBooleanFilter,
    addSearchTerm,
    removeSearchTerm,
    addExcludeTerm,
    removeExcludeTerm,
    setFilterNonLatin,
    setNullHandling,
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
  const [tempBooleanFilters, setTempBooleanFilters] = useState<Record<string, boolean | null>>({});
  const [tempNullHandling, setTempNullHandling] = useState<'zero' | 'null' | 'exclude'>('zero');

  // Dinamik sütun filtrelerini oluştur
  useEffect(() => {
    if (!columnInfo || columnInfo.length === 0) return;

    const newColumnFilters: Record<string, { min: number; max: number; display: string; originalMin: number; originalMax: number }> = {};

    columnInfo.forEach(column => {
      if (column.type === 'number' || column.type === 'percentage') {
        if (column.min !== undefined && column.max !== undefined) {
          newColumnFilters[column.name] = {
            min: column.min,
            max: column.max,
            originalMin: column.min,
            originalMax: column.max,
            display: `${column.name}: ${column.min} - ${column.max}`,
          };
        }
      }
    });

    setColumnFilters(newColumnFilters);
  }, [columnInfo]);

  // Filtreleri geçici state'lerden gerçek state'lere senkronize et
  useEffect(() => {
    setTempSearchTerms(filters.searchTerms);
    setTempExcludeTerms(filters.excludeTerms);
    setTempFilterNonLatin(filters.filterNonLatin);
    setTempBooleanFilters(filters.booleanFilters);
    setTempNullHandling(filters.nullHandling);
    
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

  const handleRemoveSearchTerm = (term: string) => {
    setTempSearchTerms(tempSearchTerms.filter(t => t !== term));
  };

  const handleAddExcludeTerm = () => {
    if (searchInput.trim()) {
      const term = searchInput.trim();
      if (!tempExcludeTerms.includes(term)) {
        setTempExcludeTerms([...tempExcludeTerms, term]);
      }
      setSearchInput('');
    }
  };

  const handleRemoveExcludeTerm = (term: string) => {
    setTempExcludeTerms(tempExcludeTerms.filter(t => t !== term));
  };

  const handleApplyFilters = () => {
    // Geçici filtreleri gerçek filtrelere uygula
    tempSearchTerms.forEach(term => addSearchTerm(term));
    tempExcludeTerms.forEach(term => addExcludeTerm(term));
    setFilterNonLatin(tempFilterNonLatin);
    setNullHandling(tempNullHandling);
    
    // Sütun filtrelerini uygula
    Object.entries(tempColumnFilters).forEach(([column, filter]) => {
      setColumnFilter(column, filter.min, filter.max);
    });

    // Boolean filtrelerini uygula
    Object.entries(tempBooleanFilters).forEach(([column, value]) => {
      setBooleanFilter(column, value);
    });

    // Filtreleri uygula
    applyFilters();
  };

  const handleClearFilters = () => {
    setTempSearchTerms([]);
    setTempExcludeTerms([]);
    setTempFilterNonLatin(false);
    setTempColumnFilters({});
    setTempBooleanFilters({});
    setTempNullHandling('zero');
    clearFilters();
  };

  const handleColumnFilterChange = (column: string, min: number, max: number) => {
    setTempColumnFilters(prev => ({
      ...prev,
      [column]: { min, max }
    }));
  };

  const handleBooleanFilterChange = (column: string, value: boolean | null) => {
    setTempBooleanFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Boolean sütunları bul
  const booleanColumns = columnInfo.filter(col => col.type === 'boolean');

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterList />
        Filtre Ayarları
      </Typography>

      {/* Null Handling Seçimi */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Null Değer İşleme</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl component="fieldset">
            <RadioGroup
              value={tempNullHandling}
              onChange={(e) => setTempNullHandling(e.target.value as 'zero' | 'null' | 'exclude')}
            >
              <FormControlLabel value="zero" control={<Radio />} label="Null değerleri 0 olarak al" />
              <FormControlLabel value="null" control={<Radio />} label="Null değerleri null olarak bırak" />
              <FormControlLabel value="exclude" control={<Radio />} label="Null değerleri olan satırları çıkar" />
            </RadioGroup>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      {/* Sütun Filtreleri */}
      {Object.keys(columnFilters).length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Sütun Filtreleri</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {Object.entries(columnFilters).map(([columnName, filter]) => (
                <Box key={columnName}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {columnName}: {tempColumnFilters[columnName]?.min || filter.originalMin} - {tempColumnFilters[columnName]?.max || filter.originalMax}
                  </Typography>
                  <Slider
                    value={[
                      tempColumnFilters[columnName]?.min || filter.originalMin,
                      tempColumnFilters[columnName]?.max || filter.originalMax
                    ]}
                    onChange={(_, newValue) => {
                      const [min, max] = newValue as number[];
                      handleColumnFilterChange(columnName, min, max);
                    }}
                    min={filter.originalMin}
                    max={filter.originalMax}
                    valueLabelDisplay="auto"
                    sx={{ width: '100%' }}
                  />
                </Box>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Boolean Filtreleri */}
      {booleanColumns.length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Boolean Filtreleri</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {booleanColumns.map(column => (
                <Box key={column.name}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {column.name}
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={tempBooleanFilters[column.name] ?? "all"}
                      onChange={(e) => {
                        const value = e.target.value;
                        const booleanValue = value === "all" ? null : value === "true";
                        handleBooleanFilterChange(column.name, booleanValue);
                      }}
                      displayEmpty
                    >
                      <MenuItem value="all">Tümü</MenuItem>
                      <MenuItem value="true">True</MenuItem>
                      <MenuItem value="false">False</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Keyword Arama */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Keyword Arama</Typography>
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
                onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleSearchSubmit}
                startIcon={<Add />}
              >
                EKLE
              </Button>
            </Box>

            {tempSearchTerms.length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Arama Terimleri:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {tempSearchTerms.map((term) => (
                    <Chip
                      key={term}
                      label={term}
                      onDelete={() => handleRemoveSearchTerm(term)}
                      size="small"
                      color="primary"
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Çıkarılacak terimler"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddExcludeTerm()}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleAddExcludeTerm}
                startIcon={<Remove />}
              >
                ÇIKAR
              </Button>
            </Box>

            {tempExcludeTerms.length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Çıkarılacak Terimler:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {tempExcludeTerms.map((term) => (
                    <Chip
                      key={term}
                      label={term}
                      onDelete={() => handleRemoveExcludeTerm(term)}
                      size="small"
                      color="error"
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Latin Harici Filtre */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Gelişmiş Filtreler</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControlLabel
            control={
              <Checkbox
                checked={tempFilterNonLatin}
                onChange={(e) => setTempFilterNonLatin(e.target.checked)}
              />
            }
            label="Sadece Latin alfabesi içeren keyword'leri göster"
          />
        </AccordionDetails>
      </Accordion>

      {/* Filtre Butonları */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleApplyFilters}
          disabled={!data || data.length === 0}
        >
          Filtreleri Uygula
        </Button>
        <Button
          variant="outlined"
          onClick={handleClearFilters}
        >
          Filtreleri Temizle
        </Button>
      </Box>
    </Box>
  );
}; 