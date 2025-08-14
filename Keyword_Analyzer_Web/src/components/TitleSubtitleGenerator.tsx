import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import { AutoAwesome, Settings } from '@mui/icons-material';
import { useAppStore } from '../store';
import { TitleSubtitleProcessor } from '../utils/titleSubtitleProcessor';
import { TitleSubtitleData } from '../types';

const countries = [
  "Afghanistan", "United Arab Emirates", "Antigua and Barbuda", "Anguilla", "Albania", "Armenia", "Angola",
  "Argentina", "Austria", "Australia", "Azerbaijan", "Barbados", "Belgium", "Bosnia and Herzegovina",
  "Burkina Faso", "Bulgaria", "Bahrain", "Benin", "Bermuda", "Brunei", "Bolivia", "Brazil", "Bahamas", "Bhutan",
  "Botswana", "Belarus", "Belize", "Cameroon", "Canada", "Congo, Republic of the", "Switzerland", "Cote d'Ivoire",
  "Chile", "China mainland", "Colombia", "Congo, Democratic Republic of the", "Costa Rica", "Cape Verde",
  "Cyprus", "Czech Republic", "Germany", "Denmark", "Dominica", "Dominican Republic", "Algeria", "Ecuador",
  "Estonia", "Egypt", "Spain", "Finland", "Fiji", "Micronesia", "France", "Gabon", "United Kingdom", "Grenada",
  "Georgia", "Ghana", "Gambia", "Greece", "Guatemala", "Guinea-Bissau", "Guyana", "Hong Kong", "Honduras",
  "Croatia", "Hungary", "Indonesia", "Ireland", "Israel", "India", "Iraq", "Iceland", "Italy", "Jamaica", "Jordan",
  "Japan", "Kenya", "Kyrgyzstan", "Cambodia", "St. Kitts and Nevis", "Republic of Korea", "Kuwait",
  "Cayman Islands", "Kazakhstan", "Laos", "Lebanon", "Libya", "St. Lucia", "Sri Lanka", "Liberia", "Lithuania",
  "Luxembourg", "Latvia", "Morocco", "Moldova", "Maldives", "Madagascar", "North Macedonia", "Mali", "Myanmar",
  "Mongolia", "Montenegro", "Macau", "Mauritania", "Montserrat", "Malta", "Mauritius", "Malawi", "Mexico",
  "Malaysia", "Mozambique", "Namibia", "Niger", "Nigeria", "Nicaragua", "Netherlands", "Norway", "Nepal", "Nauru",
  "New Zealand", "Oman", "Panama", "Peru", "Papua New Guinea", "Philippines", "Pakistan", "Poland", "Portugal",
  "Palau", "Paraguay", "Qatar", "Romania", "Russia", "Rwanda", "Saudi Arabia", "Solomon Islands", "Seychelles",
  "Sweden", "Singapore", "Slovenia", "Slovakia", "Sierra Leone", "Senegal", "Suriname", "Serbia",
  "Sao Tome and Principe", "El Salvador", "Eswatini", "Turks and Caicos Islands", "Chad", "Thailand", "Tajikistan",
  "Turkmenistan", "Tunisia", "Tonga", "Turkey", "Trinidad and Tobago", "Taiwan", "Tanzania", "Ukraine", "Uganda",
  "United States", "Uruguay", "Uzbekistan", "St. Vincent and the Grenadines", "Venezuela", "British Virgin Islands",
  "Vietnam", "Vanuatu", "Kosovo", "Yemen", "South Africa", "Zambia", "Zimbabwe"
];

interface TitleSubtitleGeneratorProps {
  onGenerated: (data: TitleSubtitleData[]) => void;
}

export const TitleSubtitleGenerator: React.FC<TitleSubtitleGeneratorProps> = ({ onGenerated }) => {
  const { mergedData, selectedCountry, appName, setSelectedCountry, setAppName, setError, setSuccess } = useAppStore();
  
  const [difficultyLimit, setDifficultyLimit] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<TitleSubtitleData[] | null>(null);

  const handleGenerate = async () => {
    if (!mergedData || mergedData.length === 0) {
      setError('Önce verileri yükleyin');
      return;
    }

    if (!appName || appName.trim() === '') {
      setError('Uygulama adı gerekli');
      return;
    }

    if (!selectedCountry || selectedCountry.trim() === '') {
      setError('Ülke seçimi gerekli');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await TitleSubtitleProcessor.processTitleSubtitle(
        mergedData,
        appName,
        selectedCountry,
        difficultyLimit
      );

      setGeneratedData(result.titleSubtitleData);
      onGenerated(result.titleSubtitleData);
      setSuccess('Title ve Subtitle başarıyla oluşturuldu!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      setError(`Title Subtitle oluşturma hatası: ${errorMessage}`);
      
      // If the error is about difficulty limit, suggest increasing it
      if (errorMessage.includes('Difficulty')) {
        setError(`${errorMessage} Zorluk sınırını artırmayı deneyin.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryWithHigherDifficulty = async () => {
    const newLimit = difficultyLimit + 10;
    setDifficultyLimit(newLimit);
    
    // Wait a bit for state update, then retry
    setTimeout(() => {
      handleGenerate();
    }, 100);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesome />
        Title & Subtitle Generator
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={3}>
        {/* App Name Input */}
        <TextField
          fullWidth
          label="Uygulama Adı"
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="Uygulamanızın adını girin"
          required
        />

        {/* Country Selection */}
        <FormControl fullWidth>
          <InputLabel>Ülke Seçimi</InputLabel>
          <Select
            value={selectedCountry}
            label="Ülke Seçimi"
            onChange={(e) => setSelectedCountry(e.target.value)}
          >
            {countries.map((country) => (
              <MenuItem key={country} value={country}>
                {country}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Difficulty Limit */}
        <TextField
          fullWidth
          label="Zorluk Sınırı"
          type="number"
          value={difficultyLimit}
          onChange={(e) => setDifficultyLimit(Number(e.target.value))}
          inputProps={{ min: 1, max: 100 }}
          helperText="Volume >= 20 ve Difficulty <= bu değer olan anahtar kelimeler kullanılır"
        />

        {/* Generate Button */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleGenerate}
          disabled={isGenerating || !mergedData || !appName || !selectedCountry}
          startIcon={isGenerating ? <CircularProgress size={20} /> : <Settings />}
        >
          {isGenerating ? 'Oluşturuluyor...' : 'Title & Subtitle Oluştur'}
        </Button>

        {/* Retry with higher difficulty button */}
        {generatedData === null && mergedData && (
          <Button
            variant="outlined"
            fullWidth
            onClick={handleRetryWithHigherDifficulty}
            disabled={isGenerating}
          >
            Zorluk Sınırını {difficultyLimit + 10} Yap ve Tekrar Dene
          </Button>
        )}

        {/* Status Messages */}
        {generatedData && (
          <Alert severity="success">
            {generatedData.length} adet Title & Subtitle başarıyla oluşturuldu!
          </Alert>
        )}

        {/* Generated Data Preview */}
        {generatedData && generatedData.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Oluşturulan Sonuçlar:
            </Typography>
            <Stack spacing={1}>
              {generatedData.slice(0, 3).map((item, index) => (
                <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {item.Title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.Subtitle}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip 
                      label={`Volume: ${item.Total_Volume}`} 
                      size="small" 
                      color="primary" 
                      sx={{ mr: 1 }} 
                    />
                    <Chip 
                      label={`Difficulty: ${item.Average_Difficulty}`} 
                      size="small" 
                      color="secondary" 
                      sx={{ mr: 1 }} 
                    />
                    <Chip 
                      label={`Eşleşen: ${item.Matched_Keywords_Count}`} 
                      size="small" 
                      variant="outlined" 
                    />
                  </Box>
                </Paper>
              ))}
              {generatedData.length > 3 && (
                <Typography variant="body2" color="text.secondary">
                  ... ve {generatedData.length - 3} tane daha
                </Typography>
              )}
            </Stack>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};
