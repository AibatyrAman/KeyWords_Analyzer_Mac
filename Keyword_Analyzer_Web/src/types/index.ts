export interface KeywordData {
  Category?: string;
  Keyword: string;
  Volume: number;
  Difficulty: number;
  'Growth (Max Reach)'?: number;
  Date?: string;
}

export interface FilterState {
  columnFilters: Record<string, { min: number; max: number }>;
  searchTerms: string[];
  excludeTerms: string[];
  filterNonLatin: boolean;
}

export interface AppState {
  // Data
  mergedData: KeywordData[] | null;
  currentTable: KeywordData[] | null;
  
  // UI State
  loading: boolean;
  error: string | null;
  success: string | null;
  
  // Settings
  dateMode: boolean;
  fileMode: boolean;
  selectedCountry: string;
  appName: string;
  
  // Filters
  filters: FilterState;
  
  // Table
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
}

export interface ColumnFilter {
  column: string;
  min: number;
  max: number;
  display: string;
}

export interface ExportOptions {
  filename: string;
  saveLocation: 'finder' | 'desktop' | 'project' | 'both';
}

export interface TitleSubtitleData {
  Title: string;
  Subtitle: string;
  Keywords?: string;
  Title_Length?: number;
  Subtitle_Length?: number;
  Keywords_Length?: number;
  Total_Volume?: number;
  Total_Difficulty?: number;
  Average_Volume?: number;
  Average_Difficulty?: number;
  Matched_Keywords_Count?: number;
} 