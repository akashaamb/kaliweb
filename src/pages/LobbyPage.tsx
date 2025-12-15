import React, { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Box, Typography, Container, CircularProgress, Paper, Button, TextField } from '@mui/material';
import { client } from '../services/api';
import type { Schema } from '../../amplify/data/resource';
import QueueList from '../components/QueueList';

const CreateProfileForm: React.FC<{ owner: string, onProfileCreated: () => void }> = ({ owner, onProfileCreated }) => {
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreateProfile = async () => {
        if (!username.trim()) {
            setError('Username cannot be empty.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const { data: newUserProfile, errors } = await client.models.UserProfile.create({
                owner,
                username,
                elo: 1000 // Initial Elo
            });
            if (errors) {
                throw errors;
            }
            console.log('Profile created:', newUserProfile);
            onProfileCreated();
        } catch (err: any) {
            console.error('Error creating profile:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 4, mt: 4, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <Typography variant="h5">Create Your Profile</Typography>
            <Typography variant="body1">Choose a username to get started.</Typography>
            <TextField
                label="Username"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                error={!!error}
                helperText={error}
            />
            <Button onClick={handleCreateProfile} variant="contained" disabled={isLoading}>
                {isLoading ? <CircularProgress size={24} /> : 'Create Profile'}
            </Button>
        </Paper>
    );
};

const Lobby: React.FC<{ userProfile: Schema['UserProfile']['type'] }> = ({ userProfile }) => {
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4">Lobby</Typography>
                    <Typography variant="h6">Welcome, {userProfile.username}!</Typography>
                    <Typography variant="body1">Your Elo: {userProfile.elo}</Typography>
                </Box>
            </Box>
            
            <QueueList />
        </Box>
    );
}

const LobbyPage: React.FC = () => {
    const { user } = useAuthenticator((context) => [context.user]);
    const [userProfile, setUserProfile] = useState<Schema['UserProfile']['type'] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [key, setKey] = useState(0); // Used to force a re-fetch after profile creation

    useEffect(() => {
        if (!user?.userId) {
            return;
        }

        const fetchUserProfile = async () => {
            setIsLoading(true);
            try {
                // Use the user's sub/userId as the owner to fetch the profile
                const { data: profile, errors } = await client.models.UserProfile.get({ owner: user.userId });
                if (errors) throw errors;
                
                setUserProfile(profile);
            } catch (error) {
                console.error('Error fetching user profile:', error);
                setUserProfile(null); // Ensure profile is null if fetch fails
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserProfile();
    }, [user, key]);

    if (isLoading) {
        return (
            <Container>
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container>
            <Box sx={{ my: 4 }}>
                {userProfile ? (
                    <Lobby userProfile={userProfile} />
                ) : (
                    <CreateProfileForm owner={user.userId} onProfileCreated={() => setKey(k => k + 1)} />
                )}
            </Box>
        </Container>
    );
};

export default LobbyPage;
