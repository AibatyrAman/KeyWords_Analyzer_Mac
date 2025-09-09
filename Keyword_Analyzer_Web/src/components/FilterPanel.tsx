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
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Remove,
  Close,
  FilterList,
} from '@mui/icons-material';
import { useAppStore } from '../store';
import { KeywordData, ColumnInfo, AnalyzedKeywordData } from '../types';
import { SimilarKeywordFinder } from '../utils/similarKeywordFinder';

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
    addSimilarSearchTerm,
    removeSimilarSearchTerm,
    setFilterNonLatin,
    setNullHandling,
    setRemoveDuplicates,
    setDuplicateRemovalStrategy,
    setKeepHighestDifficulty,
    setKeepHighestVolume,
    clearFilters,
    applyFilters,
  } = useAppStore();

  const [searchInput, setSearchInput] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, { min: number; max: number; display: string; originalMin: number; originalMax: number }>>({});
  
  // Geçici filtre state'leri
  const [tempSearchTerms, setTempSearchTerms] = useState<string[]>([]);
  const [tempExcludeTerms, setTempExcludeTerms] = useState<string[]>([]);
  const [tempSimilarSearchTerms, setTempSimilarSearchTerms] = useState<string[]>([]);
  const [tempFilterNonLatin, setTempFilterNonLatin] = useState(false);
  const [tempRemoveDuplicates, setTempRemoveDuplicates] = useState(false);
  const [tempColumnFilters, setTempColumnFilters] = useState<Record<string, { min: number; max: number }>>({});
  const [tempBooleanFilters, setTempBooleanFilters] = useState<Record<string, boolean | null>>({});
  const [tempNullHandling, setTempNullHandling] = useState<'zero' | 'null' | 'exclude'>('zero');
  
  // Similar keyword state'leri
  const [similarKeywordInput, setSimilarKeywordInput] = useState('');
  const [isFindingSimilar, setIsFindingSimilar] = useState(false);
  const [analyzedKeywords, setAnalyzedKeywords] = useState<AnalyzedKeywordData[]>([]);
  
  // AI Keyword Analysis Settings
  const [maxResults, setMaxResults] = useState(100);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.8);

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
    setTempSimilarSearchTerms(filters.similarSearchTerms);
    setTempFilterNonLatin(filters.filterNonLatin);
    setTempRemoveDuplicates(filters.removeDuplicates);
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

  const handleFindSimilarKeywords = async () => {
    if (!similarKeywordInput.trim() || !data || data.length === 0) return;
    
    setIsFindingSimilar(true);
    try {
      // GPT ile tablodaki tüm alakalı keyword'leri bul (kategorize edilmiş)
      const analyzedResults = await SimilarKeywordFinder.findRelatedKeywordsFromTable(
        similarKeywordInput.trim(),
        data,
        maxResults, // Kullanıcının ayarladığı max results
        similarityThreshold // Kullanıcının ayarladığı similarity threshold
      );
      
      // Analyzed results'ı state'e kaydet
      setAnalyzedKeywords(analyzedResults);
      
      // Keyword'leri string array'e çevir ve temp state'e ekle
      const relatedKeywords = analyzedResults.map(item => item.Keyword).filter(Boolean) as string[];
      
      // Yeni keyword'leri temp state'e ekle
      const newSimilarTerms = relatedKeywords.filter(keyword => 
        !tempSimilarSearchTerms.includes(keyword)
      );
      setTempSimilarSearchTerms([...tempSimilarSearchTerms, ...newSimilarTerms]);
      
    } catch (error) {
      console.error('Error finding related keywords:', error);
    } finally {
      setIsFindingSimilar(false);
    }
  };

  const handleRemoveSimilarSearchTerm = (term: string) => {
    setTempSimilarSearchTerms(tempSimilarSearchTerms.filter(t => t !== term));
  };

  const handleApplyFilters = () => {
    // Geçici filtreleri gerçek filtrelere uygula
    tempSearchTerms.forEach(term => addSearchTerm(term));
    tempExcludeTerms.forEach(term => addExcludeTerm(term));
    tempSimilarSearchTerms.forEach(term => addSimilarSearchTerm(term));
    setFilterNonLatin(tempFilterNonLatin);
    setRemoveDuplicates(tempRemoveDuplicates);
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
    setTempSimilarSearchTerms([]);
    setAnalyzedKeywords([]);
    setTempFilterNonLatin(false);
    setTempRemoveDuplicates(false);
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

      {/* Similar Keyword Arama */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Benzer Keyword Arama (AI)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {/* AI Analysis Settings */}
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                ⚙️ AI Analiz Ayarları
              </Typography>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    label="Max Sonuç Sayısı"
                    type="number"
                    value={maxResults}
                    onChange={(e) => setMaxResults(Math.max(1, parseInt(e.target.value) || 100))}
                    size="small"
                    helperText="GPT'den dönecek maksimum keyword sayısı (1-500)"
                    inputProps={{ min: 1, max: 500 }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    label="Benzerlik Eşiği"
                    type="number"
                    value={similarityThreshold}
                    onChange={(e) => setSimilarityThreshold(Math.max(0.1, Math.min(1.0, parseFloat(e.target.value) || 0.8)))}
                    size="small"
                    helperText="Keyword eşleşme hassasiyeti (0.1-1.0)"
                    inputProps={{ min: 0.1, max: 1.0, step: 0.1 }}
                  />
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                💡 <strong>Max Sonuç:</strong> Daha yüksek değer = daha fazla keyword, daha yavaş analiz<br/>
                💡 <strong>Benzerlik Eşiği:</strong> Daha düşük değer = daha esnek eşleşme, daha fazla sonuç
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Örn: weather, photo, music"
                value={similarKeywordInput}
                onChange={(e) => setSimilarKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleFindSimilarKeywords()}
                disabled={isFindingSimilar}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleFindSimilarKeywords}
                disabled={isFindingSimilar || !similarKeywordInput.trim() || !data || data.length === 0}
                startIcon={<Add />}
              >
                {isFindingSimilar ? 'BULUYOR...' : 'BENZER BUL'}
              </Button>
            </Box>

            {analyzedKeywords.length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Bulunan Benzer Keywords ({analyzedKeywords.length}):
                </Typography>
                
                {/* Kategorilere göre gruplandır */}
                {Object.entries(
                  analyzedKeywords.reduce((acc, item) => {
                    if (!acc[item.category]) {
                      acc[item.category] = [];
                    }
                    acc[item.category].push(item);
                    return acc;
                  }, {} as Record<string, AnalyzedKeywordData[]>)
                ).map(([category, keywords]) => (
                  <Box key={category} sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                      {category} ({keywords.length})
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {keywords.map((item) => (
                        <Chip
                          key={item.Keyword}
                          label={`${item.Keyword} (${item.relevanceScore})`}
                          onDelete={() => handleRemoveSimilarSearchTerm(item.Keyword)}
                          size="small"
                          color="secondary"
                          title={item.reason}
                        />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Box>
            )}

            <Alert severity="info">
              <Typography variant="body2">
                <strong>AI Benzer Keyword Arama:</strong><br/>
                • GPT-4 ile kategorize edilmiş, açıklanmış ve puanlanmış sonuçlar<br/>
                • Semantik benzerlik, typo detection, ilgili kavramlar<br/>
                • ASO odaklı analiz (app store optimization)<br/>
                • Kategoriler: Education, AI & Technology, Entertainment, vb.<br/>
                • Her keyword için relevance score (1-100) ve açıklama<br/>
                • Maksimum 100 alakalı keyword döndürür
              </Typography>
            </Alert>
          </Stack>
        </AccordionDetails>
      </Accordion>

              {/* Duplicate Removal Stratejileri */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Duplicate Removal Stratejileri</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {/* Ana Duplicate Removal Switch */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={tempRemoveDuplicates}
                    onChange={(e) => setTempRemoveDuplicates(e.target.checked)}
                  />
                }
                label="Duplicate keyword'leri çıkar"
              />

              {tempRemoveDuplicates && (
                <>
                  {/* Strateji Seçimi */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Duplicate Removal Stratejisi</InputLabel>
                    <Select
                      value={filters.duplicateRemovalStrategy}
                      onChange={(e) => setDuplicateRemovalStrategy(e.target.value as any)}
                      label="Duplicate Removal Stratejisi"
                    >
                      <MenuItem value="none">Hiçbiri (Duplicate'leri koru)</MenuItem>
                      <MenuItem value="same_category">Sadece Aynı Kategori İçinde</MenuItem>
                      <MenuItem value="all_duplicates">Tüm Duplicate'leri Çıkar</MenuItem>
                      <MenuItem value="smart_removal">Akıllı Removal</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Kriter Seçimi */}
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Hangi kriteri kullanarak duplicate'leri çıkarayım?
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={filters.keepHighestDifficulty}
                            onChange={(e) => setKeepHighestDifficulty(e.target.checked)}
                          />
                        }
                        label="Difficulty yüksek olanı tut"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={filters.keepHighestVolume}
                            onChange={(e) => setKeepHighestVolume(e.target.checked)}
                          />
                        }
                        label="Volume yüksek olanı tut"
                      />
                    </Stack>
                  </Box>

                  {/* Strateji Açıklamaları */}
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Strateji Açıklamaları:</strong><br/>
                      • <strong>Aynı Kategori:</strong> Sadece aynı kategorideki duplicate'leri çıkarır<br/>
                      • <strong>Tüm Duplicate:</strong> Kategori fark etmeksizin tüm duplicate'leri çıkarır<br/>
                      • <strong>Akıllı Removal:</strong> En iyi kriteri otomatik seçer
                    </Typography>
                  </Alert>
                </>
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