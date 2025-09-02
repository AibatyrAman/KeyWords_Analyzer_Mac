import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { KeywordData } from '../types';

interface MatchedKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
}

interface MatchedKeywordsDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  originalData: KeywordData[];
}

export const MatchedKeywordsDialog: React.FC<MatchedKeywordsDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  originalData,
}) => {
  const findMatchingKeywords = (): MatchedKeyword[] => {
    console.log('findMatchingKeywords called with:', { title, subtitle, originalDataLength: originalData?.length });
    console.log('First few rows of originalData:', originalData?.slice(0, 3));
    
    const titleWords = new Set(title?.toLowerCase().split(/\s+/) || []);
    const subtitleWords = new Set(subtitle?.toLowerCase().split(/\s+/) || []);
    const combinedWords = new Set(Array.from(titleWords).concat(Array.from(subtitleWords)));
    
    console.log('Combined words:', Array.from(combinedWords));
    
    const matchedKeywords: MatchedKeyword[] = [];
    
    originalData.forEach((row, index) => {
      console.log(`Processing row ${index}:`, row);
      console.log(`Row.Keyword:`, row.Keyword);
      
      if (!row.Keyword) {
        console.error(`Row ${index} has no Keyword property:`, row);
        return;
      }
      
      const keywordWords = new Set(row.Keyword.toLowerCase().split(/\s+/));
      
      // Check if all keyword words are in combined words
      const isMatch = Array.from(keywordWords).every(word => 
        Array.from(combinedWords).some(combinedWord => 
          combinedWord.includes(word) || word.includes(combinedWord)
        )
      );
      
      if (isMatch) {
        matchedKeywords.push({
          keyword: row.Keyword,
          volume: row.Volume,
          difficulty: row.Difficulty
        });
      }
    });
    
    console.log('Matched keywords:', matchedKeywords);
    return matchedKeywords.sort((a, b) => b.volume - a.volume);
  };

  const matchedKeywords = findMatchingKeywords();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6" gutterBottom>
          Eşleşen Anahtar Kelimeler
        </Typography>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {matchedKeywords.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Bu Title ve Subtitle için eşleşen anahtar kelime bulunamadı.
          </Typography>
        ) : (
          <Box>
            <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip 
                label={`${matchedKeywords.length} eşleşen kelime`} 
                color="primary" 
                size="small" 
              />
              <Chip 
                label={`Toplam Volume: ${matchedKeywords.reduce((sum, kw) => sum + kw.volume, 0).toLocaleString()}`} 
                color="secondary" 
                size="small" 
              />
              <Chip 
                label={`Ortalama Difficulty: ${(matchedKeywords.reduce((sum, kw) => sum + kw.difficulty, 0) / matchedKeywords.length).toFixed(2)}`} 
                variant="outlined" 
                size="small" 
              />
            </Box>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Anahtar Kelime</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Volume</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Difficulty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matchedKeywords.map((keyword, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{keyword.keyword}</TableCell>
                      <TableCell align="right">{keyword.volume.toLocaleString()}</TableCell>
                      <TableCell align="right">{keyword.difficulty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};
