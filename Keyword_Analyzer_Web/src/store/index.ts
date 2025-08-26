import { create } from 'zustand';
import { AppState, FilterState, KeywordData, ColumnInfo, TitleSubtitleData } from '../types';

interface AppStore extends AppState {
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  
  // Data actions
  setMergedData: (data: KeywordData[] | null) => void;
  setCurrentTable: (data: KeywordData[] | null) => void;
  setColumnInfo: (columnInfo: ColumnInfo[]) => void;
  setTitleSubtitleData: (data: TitleSubtitleData[] | null) => void;
  
  // Settings actions
  setDateMode: (mode: boolean) => void;
  setFileMode: (mode: boolean) => void;
  setSelectedCountry: (country: string) => void;
  setAppName: (name: string) => void;
  
  // Filter actions
  setColumnFilter: (column: string, min: number, max: number) => void;
  setBooleanFilter: (column: string, value: boolean | null) => void;
  addSearchTerm: (term: string) => void;
  removeSearchTerm: (term: string) => void;
  addExcludeTerm: (term: string) => void;
  removeExcludeTerm: (term: string) => void;
  addSimilarSearchTerm: (term: string) => void;
  removeSimilarSearchTerm: (term: string) => void;
  setFilterNonLatin: (filter: boolean) => void;
  setNullHandling: (handling: 'zero' | 'null' | 'exclude') => void;
  setRemoveDuplicates: (remove: boolean) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  
  // Table actions
  setSortColumn: (column: string | null) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  
  // Utility actions
  clearMessages: () => void;
}

const initialFilters: FilterState = {
  columnFilters: {},
  booleanFilters: {},
  searchTerms: [],
  excludeTerms: [],
  similarSearchTerms: [],
  filterNonLatin: false,
  nullHandling: 'zero',
  removeDuplicates: false,
};

// Güvenli sayı dönüşümü yardımcı fonksiyonu
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

// Basit string similarity hesaplama fonksiyonu
const calculateSimilarity = (str1: string, str2: string): number => {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  return (longer.length - editDistance(longer, shorter)) / longer.length;
};

// Edit distance hesaplama (Levenshtein distance)
const editDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  mergedData: null,
  currentTable: null,
  columnInfo: [],
  titleSubtitleData: null,
  loading: false,
  error: null,
  success: null,
  dateMode: false,
  fileMode: false,
  selectedCountry: 'United States',
  appName: '',
  filters: initialFilters,
  sortColumn: null,
  sortDirection: 'asc',
  
  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSuccess: (success) => set({ success }),
  
  setMergedData: (data) => set({ mergedData: data }),
  setCurrentTable: (data) => set({ currentTable: data }),
  setColumnInfo: (columnInfo) => set({ columnInfo }),
  setTitleSubtitleData: (data) => set({ titleSubtitleData: data }),
  
  setDateMode: (mode) => {
    set((state) => ({
      dateMode: mode,
      fileMode: mode ? false : state.fileMode,
    }));
  },
  
  setFileMode: (mode) => {
    set((state) => ({
      fileMode: mode,
      dateMode: mode ? false : state.dateMode,
    }));
  },
  
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  setAppName: (name) => set({ appName: name }),
  
  setColumnFilter: (column, min, max) => {
    set((state) => ({
      filters: {
        ...state.filters,
        columnFilters: {
          ...state.filters.columnFilters,
          [column]: { 
            min: safeNumberConversion(min), 
            max: safeNumberConversion(max) 
          },
        },
      },
    }));
  },

  setBooleanFilter: (column, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        booleanFilters: {
          ...state.filters.booleanFilters,
          [column]: value,
        },
      },
    }));
  },
  
  addSearchTerm: (term) => {
    set((state) => {
      const normalizedTerm = term.toLowerCase().trim();
      if (!normalizedTerm) return state;
      
      const exists = state.filters.searchTerms.some(
        (t) => t.toLowerCase() === normalizedTerm
      );
      
      if (!exists) {
        return {
          filters: {
            ...state.filters,
            searchTerms: [...state.filters.searchTerms, term.trim()],
          },
        };
      }
      return state;
    });
  },
  
  removeSearchTerm: (term) => {
    set((state) => ({
      filters: {
        ...state.filters,
        searchTerms: state.filters.searchTerms.filter((t) => t !== term),
      },
    }));
  },
  
  addExcludeTerm: (term) => {
    set((state) => {
      const normalizedTerm = term.toLowerCase().trim();
      if (!normalizedTerm) return state;
      
      const exists = state.filters.excludeTerms.some(
        (t) => t.toLowerCase() === normalizedTerm
      );
      
      if (!exists) {
        return {
          filters: {
            ...state.filters,
            excludeTerms: [...state.filters.excludeTerms, term.trim()],
          },
        };
      }
      return state;
    });
  },
  
  removeExcludeTerm: (term) => {
    set((state) => ({
      filters: {
        ...state.filters,
        excludeTerms: state.filters.excludeTerms.filter((t) => t !== term),
      },
    }));
  },
  
  addSimilarSearchTerm: (term) => {
    set((state) => {
      const normalizedTerm = term.toLowerCase().trim();
      if (!normalizedTerm) return state;
      
      const exists = state.filters.similarSearchTerms.some(
        (t) => t.toLowerCase() === normalizedTerm
      );
      
      if (!exists) {
        return {
          filters: {
            ...state.filters,
            similarSearchTerms: [...state.filters.similarSearchTerms, term.trim()],
          },
        };
      }
      return state;
    });
  },
  
  removeSimilarSearchTerm: (term) => {
    set((state) => ({
      filters: {
        ...state.filters,
        similarSearchTerms: state.filters.similarSearchTerms.filter((t) => t !== term),
      },
    }));
  },
  
  setFilterNonLatin: (filter) => {
    set((state) => ({
      filters: {
        ...state.filters,
        filterNonLatin: filter,
      },
    }));
  },

  setNullHandling: (handling) => {
    set((state) => ({
      filters: {
        ...state.filters,
        nullHandling: handling,
      },
    }));
  },
  
  clearFilters: () => {
    set((state) => ({
      filters: initialFilters,
    }));
  },
  
  applyFilters: () => {
    const state = get();
    if (!state.mergedData) return;
    
    let filteredData = [...state.mergedData];
    
    // Sütun filtrelerini uygula
    Object.entries(state.filters.columnFilters).forEach(([column, filter]) => {
      filteredData = filteredData.filter((row) => {
        const value = safeNumberConversion(row[column as keyof KeywordData]);
        return value >= filter.min && value <= filter.max;
      });
    });

    // Boolean filtrelerini uygula
    Object.entries(state.filters.booleanFilters).forEach(([column, filterValue]) => {
      if (filterValue !== null) {
        filteredData = filteredData.filter((row) => {
          const value = row[column as keyof KeywordData];
          return value === filterValue;
        });
      }
    });
    
    // Arama terimlerini uygula
    if (state.filters.searchTerms.length > 0) {
      filteredData = filteredData.filter((row) => {
        const keyword = String(row.Keyword || '').toLowerCase();
        return state.filters.searchTerms.some((term) =>
          keyword.includes(term.toLowerCase())
        );
      });
    }
    
    // Çıkarılacak terimleri uygula
    if (state.filters.excludeTerms.length > 0) {
      filteredData = filteredData.filter((row) => {
        const keyword = String(row.Keyword || '').toLowerCase();
        return !state.filters.excludeTerms.some((term) =>
          keyword.includes(term.toLowerCase())
        );
      });
    }
    
    // Benzer keyword arama terimlerini uygula
    if (state.filters.similarSearchTerms.length > 0) {
      const allKeywords = filteredData.map(row => String(row.Keyword || ''));
      const similarKeywords = new Set<string>();
      
      // Her benzer arama terimi için keyword'leri bul
      state.filters.similarSearchTerms.forEach(searchTerm => {
        const searchWords = searchTerm.toLowerCase().split(/\s+/);
        
        allKeywords.forEach(keyword => {
          const keywordWords = keyword.toLowerCase().split(/\s+/);
          
          // Semantic similarity check
          const isSimilar = searchWords.some(searchWord => 
            keywordWords.some(keywordWord => 
              keywordWord.includes(searchWord) || 
              searchWord.includes(keywordWord) ||
              calculateSimilarity(searchWord, keywordWord) > 0.7
            )
          );
          
          if (isSimilar) {
            similarKeywords.add(keyword);
          }
        });
      });
      
      // Sadece benzer keyword'leri tut
      if (similarKeywords.size > 0) {
        filteredData = filteredData.filter(row => 
          similarKeywords.has(String(row.Keyword || ''))
        );
      }
    }
    
    // Latin harici alfabeleri çıkar
    if (state.filters.filterNonLatin) {
      filteredData = filteredData.filter((row) => {
        const keyword = String(row.Keyword || '');
        return /^[a-zA-Z0-9\s\-_.,!?()]+$/.test(keyword);
      });
    }

    // Null değerleri işle
    if (state.filters.nullHandling === 'exclude') {
      filteredData = filteredData.filter((row) => {
        return Object.values(row).every(val => val !== null && val !== undefined && val !== '');
      });
    }

    // Duplicates removal - aynı kategorideki duplicate keyword'lerde difficulty değeri düşük olanı çıkar
    if (state.filters.removeDuplicates) {
      const keywordMap = new Map<string, KeywordData>();
      
      filteredData.forEach(item => {
        const keyword = String(item.Keyword || '').toLowerCase();
        const category = String(item.Category || '');
        const key = `${keyword}|${category}`;
        
        if (keywordMap.has(key)) {
          // Aynı keyword ve kategori varsa, difficulty değeri yüksek olanı tut
          const existing = keywordMap.get(key)!;
          const existingDifficulty = safeNumberConversion(existing.Difficulty);
          const currentDifficulty = safeNumberConversion(item.Difficulty);
          
          if (currentDifficulty > existingDifficulty) {
            keywordMap.set(key, item);
          }
        } else {
          keywordMap.set(key, item);
        }
      });
      
      filteredData = Array.from(keywordMap.values());
    }
    
    set({ currentTable: filteredData });
  },
  
  setSortColumn: (column) => set({ sortColumn: column }),
  setSortDirection: (direction) => set({ sortDirection: direction }),
  
  clearMessages: () => set({ error: null, success: null }),
  setRemoveDuplicates: (remove) => {
    set((state) => ({
      filters: {
        ...state.filters,
        removeDuplicates: remove,
      },
    }));
  },
})); 