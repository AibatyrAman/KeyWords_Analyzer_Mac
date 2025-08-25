export interface KeywordData {
  Category?: string;
  Keyword: string;
  Volume: number;
  Difficulty: number;
  'Growth (Max Reach)'?: number;
  'Max. Reach'?: number;
  'No. of results'?: number;
  Date?: string;
  [key: string]: any; // Dinamik sütunlar için
}

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'percentage' | 'date';
  min?: number;
  max?: number;
  hasNulls: boolean;
  uniqueValues?: any[];
  booleanValues?: boolean[];
}

export interface FilterState {
  columnFilters: Record<string, { min: number; max: number }>;
  booleanFilters: Record<string, boolean | null>; // null = tümü, true = sadece true, false = sadece false
  searchTerms: string[];
  excludeTerms: string[];
  filterNonLatin: boolean;
  nullHandling: 'zero' | 'null' | 'exclude'; // null değerleri nasıl işleyeceğimiz
  removeDuplicates: boolean; // Duplicate keyword'leri çıkar
}

export interface AppState {
  // Data
  mergedData: KeywordData[] | null;
  currentTable: KeywordData[] | null;
  columnInfo: ColumnInfo[]; // Dinamik sütun bilgileri
  titleSubtitleData: TitleSubtitleData[] | null;
  
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
  type: 'number' | 'percentage';
}

export interface BooleanFilter {
  column: string;
  value: boolean | null; // null = tümü
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
  [key: string]: any; // Dinamik sütunlar için
} 