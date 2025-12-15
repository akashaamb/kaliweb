import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Container, CircularProgress, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';
import { client } from '../services/api';
import type { Schema } from '../../amplify/data/resource';

const ProfilePage: React.FC = () => {
    const { ownerId } = useParams<{ ownerId: string }>();
    const [profile, setProfile] = useState<Schema['UserProfile']['type'] | null>(null);
    const [matches, setMatches] = useState<Schema['Match']['type'][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ownerId) {
            setError('No user ID provided.');
            setIsLoading(false);
            return;
        }

        const fetchProfileAndMatches = async () => {
            setIsLoading(true);
            try {
                // Fetch profile
                const { data: profileData, errors: profileErrors } = await client.models.UserProfile.get({ owner: ownerId });
                if (profileErrors || !profileData) throw new Error('Could not fetch user profile.');
                setProfile(profileData);

                // Fetch matches
                const { data: matchesData, errors: matchErrors } = await client.models.Match.list({
                    filter: {
                        or: [
                            { teamA: { contains: ownerId } },
                            { teamB: { contains: ownerId } }
                        ]
                    }
                });
                if (matchErrors) throw new Error('Could not fetch match history.');
                
                // Sort matches by creation date, newest first
                const sortedMatches = matchesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setMatches(sortedMatches);

            } catch (err: any) {
                setError(err.message);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfileAndMatches();
    }, [ownerId]);

    if (isLoading) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;
    if (error) return <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>{error}</Typography>;
    if (!profile) return <Typography sx={{ textAlign: 'center', mt: 4 }}>User not found.</Typography>;

    return (
        <Container>
            <Paper sx={{ my: 4, p: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {profile.username}
                </Typography>
                <Typography variant="h6" color="primary.main">
                    Elo: {profile.elo}
                </Typography>
            </Paper>

            <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
                Match History
            </Typography>
            <Paper>
                <List>
                    {matches.length > 0 ? matches.map((match, index) => (
                        <React.Fragment key={match.id}>
                            <ListItem>
                                <ListItemText
                                    primary={`Match: ${match.name}`}
                                    secondary={`Result: Team ${match.winningTeam} won | Date: ${new Date(match.createdAt).toLocaleDateString()}`}
                                />
                            </ListItem>
                            {index < matches.length - 1 && <Divider />}
                        </React.Fragment>
                    )) : (
                        <ListItem>
                            <ListItemText primary="No matches played yet." />
                        </ListItem>
                    )}
                </List>
            </Paper>
        </Container>
    );
};

export default ProfilePage;
