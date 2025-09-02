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
  setDuplicateRemovalStrategy: (strategy: 'none' | 'same_category' | 'all_duplicates' | 'smart_removal') => void;
  setKeepHighestDifficulty: (keep: boolean) => void;
  setKeepHighestVolume: (keep: boolean) => void;
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
  removeDuplicates: true, // Varsayılan olarak açık
  duplicateRemovalStrategy: 'all_duplicates', // Varsayılan olarak tüm duplicate'leri çıkar
  keepHighestDifficulty: true, // Varsayılan olarak difficulty yüksek olanı tut
  keepHighestVolume: false, // Varsayılan olarak volume'u dikkate alma
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

// Case-insensitive keyword değeri alma fonksiyonu
const getKeywordValue = (row: any): string => {
  // Önce büyük K ile dene
  if (row.Keyword !== undefined) {
    return String(row.Keyword || '');
  }
  // Sonra küçük k ile dene
  if (row.keyword !== undefined) {
    return String(row.keyword || '');
  }
  // Hiçbiri yoksa boş string döndür
  return '';
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
        const keyword = getKeywordValue(row).toLowerCase();
        return state.filters.searchTerms.some((term) => {
          const searchTerm = term.toLowerCase();
          // Tam kelime eşleşmesi yap
          const keywordWords = keyword.split(/\s+/);
          return keywordWords.some(word => word === searchTerm);
        });
      });
    }
    
    // Çıkarılacak terimleri uygula
    if (state.filters.excludeTerms.length > 0) {
      filteredData = filteredData.filter((row) => {
        const keyword = getKeywordValue(row).toLowerCase();
        return !state.filters.excludeTerms.some((term) => {
          const searchTerm = term.toLowerCase();
          // Tam kelime eşleşmesi yap
          const keywordWords = keyword.split(/\s+/);
          return keywordWords.some(word => word === searchTerm);
        });
      });
    }
    
    // Latin harici alfabeleri çıkar
    if (state.filters.filterNonLatin) {
      filteredData = filteredData.filter((row) => {
        const keyword = getKeywordValue(row);
        return /^[a-zA-Z0-9\s\-_.,!?()]+$/.test(keyword);
      });
    }

    // Null değerleri işle
    if (state.filters.nullHandling === 'exclude') {
      filteredData = filteredData.filter((row) => {
        return Object.values(row).every(val => val !== null && val !== undefined && val !== '');
      });
    }

    // Duplicates removal - Gelişmiş duplicate removal stratejileri
    if (state.filters.removeDuplicates) {
      const keywordMap = new Map<string, KeywordData>();
      
      filteredData.forEach(item => {
        const keyword = getKeywordValue(item).toLowerCase();
        const category = String(item.Category || '');
        
        // Stratejiye göre key oluştur
        let key: string;
        switch (state.filters.duplicateRemovalStrategy) {
          case 'none':
            return; // Duplicate removal yapma
          case 'same_category':
            key = `${keyword}|${category}`; // Sadece aynı kategori içinde
            break;
          case 'all_duplicates':
            key = keyword; // Tüm duplicate'leri çıkar (kategori fark etmez)
            break;
          case 'smart_removal':
            key = `${keyword}|${category}`; // Akıllı removal
            break;
          default:
            key = keyword;
        }
        
        if (keywordMap.has(key)) {
          // Duplicate bulundu, hangi kriteri kullanacağımızı belirle
          const existing = keywordMap.get(key)!;
          let shouldReplace = false;
          
          if (state.filters.keepHighestDifficulty) {
            const existingDifficulty = safeNumberConversion(existing.Difficulty);
            const currentDifficulty = safeNumberConversion(item.Difficulty);
            if (currentDifficulty > existingDifficulty) {
              shouldReplace = true;
            }
          }
          
          if (state.filters.keepHighestVolume) {
            const existingVolume = safeNumberConversion(existing.Volume);
            const currentVolume = safeNumberConversion(item.Volume);
            if (currentVolume > existingVolume) {
              shouldReplace = true;
            }
          }
          
          // Eğer hiçbir kriter seçilmemişse, ilk geleni tut
          if (!state.filters.keepHighestDifficulty && !state.filters.keepHighestVolume) {
            shouldReplace = false; // Mevcut olanı tut
          }
          
          if (shouldReplace) {
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

  setDuplicateRemovalStrategy: (strategy) => {
    set((state) => ({
      filters: {
        ...state.filters,
        duplicateRemovalStrategy: strategy,
      },
    }));
  },

  setKeepHighestDifficulty: (keep) => {
    set((state) => ({
      filters: {
        ...state.filters,
        keepHighestDifficulty: keep,
      },
    }));
  },

  setKeepHighestVolume: (keep) => {
    set((state) => ({
      filters: {
        ...state.filters,
        keepHighestVolume: keep,
      },
    }));
  },
})); 