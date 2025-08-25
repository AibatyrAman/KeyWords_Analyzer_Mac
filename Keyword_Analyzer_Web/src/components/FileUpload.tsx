import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  Collapse,
} from '@mui/material';
import {
  CloudUpload,
  Folder,
  FileCopy,
  Delete,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useAppStore } from '../store';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected }) => {
  const {
    dateMode,
    fileMode,
    setDateMode,
    setFileMode,
    setError,
    setSuccess,
  } = useAppStore();

  const [showSelectedFiles, setShowSelectedFiles] = useState(true);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        setError('Lütfen geçerli dosyalar seçin');
        return;
      }

      // Dosya türü kontrolü
      const csvFiles = acceptedFiles.filter(file => 
        file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
      );

      if (csvFiles.length === 0) {
        setError('Lütfen CSV dosyaları seçin');
        return;
      }

      if (fileMode) {
        // Tek dosya modu
        if (csvFiles.length > 1) {
          setError('Tek dosya modunda sadece bir CSV dosyası seçebilirsiniz');
          return;
        }
        setSuccess(`CSV dosyası seçildi: ${csvFiles[0].name}`);
      } else if (dateMode) {
        // Tarih modu - klasör yapısı kontrol et
        const folderStructure = groupFilesByFolder(csvFiles);
        if (Object.keys(folderStructure).length === 0) {
          setError('Tarih modu için klasör yapısı gerekli');
          return;
        }
        setSuccess(`${Object.keys(folderStructure).length} klasör, ${csvFiles.length} CSV dosyası seçildi`);
      } else {
        // Normal mod
        setSuccess(`${csvFiles.length} CSV dosyası seçildi`);
      }

      onFilesSelected(csvFiles);
    },
    [fileMode, dateMode, onFilesSelected, setError, setSuccess]
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: !fileMode,
  });

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

  const removeFile = (fileToRemove: File) => {
    const remainingFiles = acceptedFiles.filter(file => file !== fileToRemove);
    onFilesSelected(remainingFiles);
  };

  const clearAllFiles = () => {
    onFilesSelected([]);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Mode Switches */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={dateMode}
              onChange={(e) => setDateMode(e.target.checked)}
              color="secondary"
            />
          }
          label="📅 Tarih Modu (Çoklu Klasör)"
        />
        <FormControlLabel
          control={
            <Switch
              checked={fileMode}
              onChange={(e) => setFileMode(e.target.checked)}
              color="warning"
            />
          }
          label="📄 Dosya Modu (Tek CSV)"
        />
      </Stack>

      {/* Upload Area */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'primary.50' : 'background.paper',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'primary.50',
          },
        }}
      >
        <input {...getInputProps()} />
        
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          {fileMode ? 'CSV Dosyası Seç' : 'CSV Dosyaları Seç'}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {fileMode 
            ? 'Tek bir CSV dosyası seçin'
            : dateMode 
              ? 'Klasör yapısı ile CSV dosyalarını sürükleyin'
              : 'CSV dosyalarını sürükleyin veya tıklayın'
          }
        </Typography>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {fileMode 
              ? '• Tek CSV dosyası işleme modu'
              : dateMode 
                ? '• Çoklu klasör işleme modu (tarih bilgisi ile)'
                : '• Tek klasör işleme modu'
            }
          </Typography>
        </Alert>
      </Paper>

      {/* Selected Files */}
      {acceptedFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" color="primary">
                Seçilen Dosyalar ({acceptedFiles.length})
              </Typography>
              <IconButton
                size="small"
                onClick={() => setShowSelectedFiles(!showSelectedFiles)}
                color="primary"
                title={showSelectedFiles ? "Dosyaları gizle" : "Dosyaları göster"}
              >
                {showSelectedFiles ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Stack>
            <IconButton
              size="small"
              onClick={clearAllFiles}
              color="error"
              title="Tüm dosyaları temizle"
            >
              <Delete />
            </IconButton>
          </Stack>

          <Collapse in={showSelectedFiles}>
            <Stack spacing={1}>
              {acceptedFiles.map((file, index) => (
                <Chip
                  key={index}
                  icon={<FileCopy />}
                  label={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                  onDelete={() => removeFile(file)}
                  variant="outlined"
                  color="primary"
                  sx={{ justifyContent: 'space-between' }}
                />
              ))}
            </Stack>

            {dateMode && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="secondary" gutterBottom>
                  Klasör Yapısı:
                </Typography>
                {Object.entries(groupFilesByFolder(Array.from(acceptedFiles))).map(([folder, files]) => (
                  <Chip
                    key={folder}
                    icon={<Folder />}
                    label={`${folder} (${files.length} dosya)`}
                    variant="outlined"
                    color="secondary"
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            )}
          </Collapse>
        </Box>
      )}
    </Box>
  );
}; 