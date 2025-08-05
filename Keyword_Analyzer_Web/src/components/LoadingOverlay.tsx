import React from 'react';
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';
import { useAppStore } from '../store';

export const LoadingOverlay: React.FC = () => {
  const { loading } = useAppStore();

  if (!loading) return null;

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
      open={loading}
    >
      <CircularProgress color="inherit" size={60} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          İşleniyor...
        </Typography>
        <Typography variant="body2" color="inherit">
          Lütfen bekleyin, veriler işleniyor
        </Typography>
      </Box>
    </Backdrop>
  );
}; 