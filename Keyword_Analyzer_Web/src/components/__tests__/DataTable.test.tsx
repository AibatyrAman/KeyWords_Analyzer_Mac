import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataTable } from '../DataTable';
import { useAppStore } from '../../store';
import { ColumnInfo } from '../../types';

// Mock the store
jest.mock('../../store', () => ({
  useAppStore: jest.fn()
}));

// Mock the ExportUtils
jest.mock('../../utils/exportUtils', () => ({
  ExportUtils: {
    exportToExcel: jest.fn(),
    sanitizeFilename: jest.fn((name) => name),
    debugDataFormat: jest.fn()
  }
}));

// Mock the MatchedKeywordsDialog
jest.mock('../MatchedKeywordsDialog', () => ({
  MatchedKeywordsDialog: () => <div data-testid="matched-keywords-dialog">Dialog</div>
}));

describe('DataTable', () => {
  const mockColumnInfo: ColumnInfo[] = [
    { name: 'Volume', type: 'number', hasNulls: false },
    { name: 'Difficulty', type: 'number', hasNulls: false },
    { name: 'Growth Rate', type: 'percentage', hasNulls: false },
    { name: 'Success Rate', type: 'percentage', hasNulls: false },
    { name: 'Category', type: 'string', hasNulls: false }
  ];

  const mockData = [
    {
      Volume: 1000,
      Difficulty: 50,
      'Growth Rate': 0.25,
      'Success Rate': 0.75,
      Category: 'Test'
    }
  ];

  const mockStoreState = {
    sortColumn: null,
    sortDirection: 'asc' as const,
    setSortColumn: jest.fn(),
    setSortDirection: jest.fn(),
    filters: {
      columnFilters: {},
      booleanFilters: {},
      searchTerms: [],
      excludeTerms: [],
      filterNonLatin: false,
      nullHandling: 'zero' as const
    },
    setError: jest.fn(),
    setSuccess: jest.fn(),
    columnInfo: mockColumnInfo,
    mergedData: null
  };

  beforeEach(() => {
    (useAppStore as jest.Mock).mockReturnValue(mockStoreState);
  });

  it('should display percentage column headers with % symbol', () => {
    render(<DataTable data={mockData} title="Test Table" />);

    // Check that percentage columns have % symbol
    expect(screen.getByText('Growth Rate %')).toBeInTheDocument();
    expect(screen.getByText('Success Rate %')).toBeInTheDocument();
    
    // Check that non-percentage columns don't have % symbol
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('Difficulty')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('should display correct number of records', () => {
    render(<DataTable data={mockData} title="Test Table" />);
    
    expect(screen.getByText('1 kayıt')).toBeInTheDocument();
  });

  it('should display table title', () => {
    render(<DataTable data={mockData} title="Test Table" />);
    
    expect(screen.getByText('Test Table')).toBeInTheDocument();
  });

  it('should show "Veri bulunamadı" when no data', () => {
    render(<DataTable data={[]} title="Test Table" />);
    
    expect(screen.getByText('Veri bulunamadı')).toBeInTheDocument();
  });
});



