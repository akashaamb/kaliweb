import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthUser } from 'aws-amplify/auth'; // AuthUser is correct

type HeaderProps = {
  signOut?: () => void; // Corrected type for signOut function
  user?: AuthUser;
};

const Header: React.FC<HeaderProps> = ({ signOut, user }) => {
  return (
    <AppBar position="static">
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, pr: 2 }}>
          <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            Kali Matchmaking
          </RouterLink>
        </Typography>
        {user ? (
          <Box display="flex" alignItems="center">
            <Button color="inherit" component={RouterLink} to={`/profile/${user.userId}`}>
                My Profile
            </Button>
            <Button color="inherit" onClick={signOut}>
              Logout
            </Button>
          </Box>
        ) : (
          <>
            <Button color="inherit" component={RouterLink} to="/login">
              Login
            </Button>
            <Button color="inherit" component={RouterLink} to="/signup">
              Sign Up
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
