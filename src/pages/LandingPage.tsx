import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const HomePage: React.FC = () => {
  return (
    <Container>
      <Box
        sx={{
          my: 4,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Kali Web
        </Typography>
        <Typography variant="body1">
          Welcome to the matchmaking service.
        </Typography>
      </Box>
    </Container>
  );
};

export default HomePage;
