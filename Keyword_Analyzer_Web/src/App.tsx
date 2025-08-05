import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Stack,
  Divider,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import {
  Analytics,
  CloudUpload,
  TableChart,
} from '@mui/icons-material';
import { useAppStore } from './store';
import { FileUpload } from './components/FileUpload';
import { FilterPanel } from './components/FilterPanel';
import { DataTable } from './components/DataTable';
import { MessageDisplay } from './components/MessageDisplay';
import { LoadingOverlay } from './components/LoadingOverlay';
import { CsvProcessor } from './utils/csvProcessor';
import { KeywordData } from './types';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  const {
    mergedData,
    currentTable,
    setMergedData,
    setCurrentTable,
    setLoading,
    setError,
    setSuccess,
    dateMode,
    fileMode,
  } = useAppStore();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleLoadData = async () => {
    if (selectedFiles.length === 0) {
      setError('Lütfen önce dosyalar seçin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let processedData: KeywordData[];

      if (fileMode) {
        // Tek dosya modu
        processedData = await CsvProcessor.processSingleCsvFile(selectedFiles[0]);
        setSuccess('Tek CSV dosyası başarıyla yüklendi');
      } else if (dateMode) {
        // Tarih modu - klasör yapısını grupla
        const folderStructure = groupFilesByFolder(selectedFiles);
        const folderArrays = Object.values(folderStructure);
        processedData = await CsvProcessor.mergeWithDateData(folderArrays);
        setSuccess('Çoklu klasör verileri başarıyla yüklendi');
      } else {
        // Normal mod
        processedData = await CsvProcessor.mergeNoDuplicateData(selectedFiles);
        setSuccess('Veriler başarıyla yüklendi');
      }

      setMergedData(processedData);
      setCurrentTable(processedData);
    } catch (error) {
      setError(`Veri yükleme hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };

  const groupFilesByFolder = (files: File[]) => {
    const folders: Record<string, File[]> = {};
    
    files.forEach(file => {
      const pathParts = (file as any).webkitRelativePath?.split('/') || [file.name];
      const folderName = pathParts[0];
      
      if (!folders[folderName]) {
        folders[folderName] = [];
      }
      folders[folderName].push(file);
    });
    
    return folders;
  };

  const handleShowFilteredTable = () => {
    if (!mergedData) {
      setError('Önce verileri yükleyin');
      return;
    }
    setCurrentTable(mergedData);
    setSuccess('Filtrelenmiş tablo gösteriliyor');
  };

  const handleShowAllData = () => {
    if (!mergedData) {
      setError('Önce verileri yükleyin');
      return;
    }
    setCurrentTable(mergedData);
    setSuccess('Tüm veriler gösteriliyor');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Analytics sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                ASO Keywords Analyzer
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                Professional Edition
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Grid container spacing={3}>
          {/* Left Panel - Controls */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, height: 'fit-content' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudUpload />
                Dosya Yükleme
              </Typography>
              
              <FileUpload onFilesSelected={handleFilesSelected} />
              
              <Divider sx={{ my: 3 }} />
              
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleLoadData}
                disabled={selectedFiles.length === 0}
                sx={{ mb: 2 }}
              >
                Verileri Yükle
              </Button>

              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleShowFilteredTable}
                  disabled={!mergedData}
                >
                  Birleştirilmiş Ana Tablo (Filtreli)
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleShowAllData}
                  disabled={!mergedData}
                >
                  Birleştirilmiş Ana Tablo (Tümü)
                </Button>
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* Filter Panel */}
              <FilterPanel data={mergedData} />
            </Paper>
          </Grid>

          {/* Right Panel - Table */}
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3, minHeight: 600 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TableChart />
                Veri Tablosu
              </Typography>
              
              {currentTable ? (
                <DataTable
                  data={currentTable}
                  title="ASO Keywords Data"
                />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 400,
                    color: 'text.secondary',
                  }}
                >
                  <TableChart sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" gutterBottom>
                    Veri Tablosu
                  </Typography>
                  <Typography variant="body2" textAlign="center">
                    Veriler yüklendikten sonra tablolar burada görünecek
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Global Components */}
      <MessageDisplay />
      <LoadingOverlay />
    </ThemeProvider>
  );
}

export default App; 