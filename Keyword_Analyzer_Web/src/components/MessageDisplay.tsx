import React, { useEffect } from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';
import { useAppStore } from '../store';

export const MessageDisplay: React.FC = () => {
  const { error, success, setError, setSuccess } = useAppStore();

  const handleCloseError = () => {
    setError(null);
  };

  const handleCloseSuccess = () => {
    setSuccess(null);
  };

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, setSuccess]);

  return (
    <>
      {/* Error Message */}
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          <AlertTitle>Hata</AlertTitle>
          {error}
        </Alert>
      </Snackbar>

      {/* Success Message */}
      <Snackbar
        open={!!success}
        autoHideDuration={5000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSuccess}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          <AlertTitle>Başarılı</AlertTitle>
          {success}
        </Alert>
      </Snackbar>
    </>
  );
}; 