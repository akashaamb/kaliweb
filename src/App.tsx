import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import AppRoutes from './routes';
import Header from './components/Header';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Authenticator>
        {({ signOut, user }) => (
          <>
            <Header signOut={signOut} user={user} />
            <AppRoutes />
          </>
        )}
      </Authenticator>
    </ThemeProvider>
  );
};

export default App;
