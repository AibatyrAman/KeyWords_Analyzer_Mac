import { create } from 'zustand';
import { AppState, FilterState, KeywordData } from '../types';

interface AppStore extends AppState {
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  
  // Data actions
  setMergedData: (data: KeywordData[] | null) => void;
  setCurrentTable: (data: KeywordData[] | null) => void;
  
  // Settings actions
  setDateMode: (mode: boolean) => void;
  setFileMode: (mode: boolean) => void;
  setSelectedCountry: (country: string) => void;
  setAppName: (name: string) => void;
  
  // Filter actions
  setColumnFilter: (column: string, min: number, max: number) => void;
  addSearchTerm: (term: string) => void;
  removeSearchTerm: (term: string) => void;
  addExcludeTerm: (term: string) => void;
  removeExcludeTerm: (term: string) => void;
  setFilterNonLatin: (filter: boolean) => void;
  clearFilters: () => void;
  
  // Table actions
  setSortColumn: (column: string | null) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  
  // Utility actions
  clearMessages: () => void;
}

const initialFilters: FilterState = {
  columnFilters: {},
  searchTerms: [],
  excludeTerms: [],
  filterNonLatin: false,
};

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  mergedData: null,
  currentTable: null,
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
          [column]: { min, max },
        },
      },
    }));
  },
  
  addSearchTerm: (term) => {
    set((state) => {
      const normalizedTerm = term.toLowerCase();
      const exists = state.filters.searchTerms.some(
        (t) => t.toLowerCase() === normalizedTerm
      );
      
      if (!exists) {
        return {
          filters: {
            ...state.filters,
            searchTerms: [...state.filters.searchTerms, term],
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
      const normalizedTerm = term.toLowerCase();
      const exists = state.filters.excludeTerms.some(
        (t) => t.toLowerCase() === normalizedTerm
      );
      
      if (!exists) {
        return {
          filters: {
            ...state.filters,
            excludeTerms: [...state.filters.excludeTerms, term],
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
  
  clearFilters: () => {
    set((state) => ({
      filters: initialFilters,
    }));
  },
  
  setSortColumn: (column) => set({ sortColumn: column }),
  setSortDirection: (direction) => set({ sortDirection: direction }),
  
  clearMessages: () => set({ error: null, success: null }),
})); 