import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Box, Paper } from '@mui/material';

const LoginPage: React.FC = () => {
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="80vh"
    >
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Authenticator />
      </Paper>
    </Box>
  );
};

export default LoginPage;
