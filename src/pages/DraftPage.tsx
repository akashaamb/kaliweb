import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Container, CircularProgress, Paper, Grid, List, ListItem, Button, Chip } from '@mui/material';
import { client } from '../services/api';
import type { Schema } from '../../amplify/data/resource';
import { useAuthenticator } from '@aws-amplify/ui-react';

// This component is now simpler and just displays the data
const PlayerChip: React.FC<{ profile: Schema['UserProfile']['type'] | null }> = ({ profile }) => {
    return <Chip label={profile ? `${profile.username} (${profile.elo})` : 'Loading...'} sx={{ m: 0.5 }} />;
};

const DraftPage: React.FC = () => {
    const { queueId } = useParams();
    const { user } = useAuthenticator((context) => [context.user]);
    const navigate = useNavigate();

    const [queue, setQueue] = useState<Schema['Queue']['type'] | null>(null);
    const [profiles, setProfiles] = useState<Map<string, Schema['UserProfile']['type']>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!queueId) {
            setError('No Queue ID provided.');
            setIsLoading(false);
            return;
        }

        const fetchQueueAndProfiles = async () => {
            setIsLoading(true);
            try {
                const { data: queueData, errors: queueErrors } = await client.models.Queue.get({ id: queueId });
                if (queueErrors || !queueData) {
                    throw new Error('Could not fetch queue data.');
                }
                
                if (queueData.players) {
                    const profilePromises = queueData.players.map(owner => client.models.UserProfile.get({ owner }));
                    const profileResults = await Promise.all(profilePromises);
                    const newProfiles = new Map<string, Schema['UserProfile']['type']>();
                    profileResults.forEach(({ data: profile }) => {
                        if (profile) newProfiles.set(profile.owner, profile);
                    });
                    setProfiles(newProfiles);
                }
                setQueue(queueData);

            } catch (err: any) {
                setError(err.message || 'An error occurred.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQueueAndProfiles();

        const updateSub = client.models.Queue.onUpdate({ filter: { id: { eq: queueId } } }).subscribe({
            next: (updatedQueue) => {
                setQueue(updatedQueue);
                if (updatedQueue.status === 'IN_PROGRESS') {
                    navigate(`/match/${updatedQueue.id}`);
                }
            },
            error: (err) => console.error('Subscription error:', err),
        });

        return () => updateSub.unsubscribe();
    }, [queueId, navigate]);

    const isMyTurn = useMemo(() => queue?.currentDrafter === user?.userId, [queue, user]);

    const handlePickPlayer = async (playerOwnerId: string) => {
        if (!isMyTurn || !queue || !queue.draftPool || !queue.teamA || !queue.teamB || !queue.teamACaptain || !queue.teamBCaptain) return;

        const isCaptainA = queue.teamACaptain === user?.userId;
        const currentPickNumber = (queue.teamA.length - 1) + (queue.teamB.length - 1);

        let nextDrafterId: string | null = null;
        let status = queue.status;

        switch (currentPickNumber) {
            case 0: // A picks 1st -> B's turn
                nextDrafterId = queue.teamBCaptain;
                break;
            case 1: // B picks 1st -> B's turn
                nextDrafterId = queue.teamBCaptain;
                break;
            case 2: // B picks 2nd -> A's turn
                nextDrafterId = queue.teamACaptain;
                break;
            case 3: // A picks 2nd -> A's turn
                nextDrafterId = queue.teamACaptain;
                break;
            case 4: // A picks 3rd -> B's turn
                nextDrafterId = queue.teamBCaptain;
                break;
            case 5: // B picks 3rd -> Draft over
                nextDrafterId = null;
                status = 'IN_PROGRESS';
                break;
            default:
                break;
        }

        try {
            await client.models.Queue.update({
                id: queue.id,
                draftPool: queue.draftPool.filter(p => p !== playerOwnerId),
                teamA: isCaptainA ? [...queue.teamA, playerOwnerId] : queue.teamA,
                teamB: !isCaptainA ? [...queue.teamB, playerOwnerId] : queue.teamB,
                currentDrafter: nextDrafterId,
                status: status,
            });
        } catch (err) {
            console.error('Error picking player:', err);
        }
    };

    if (isLoading) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!queue) return <Typography>Queue not found.</Typography>;

    const captainAProfile = profiles.get(queue.teamACaptain!);
    const captainBProfile = profiles.get(queue.teamBCaptain!);

    return (
        <Container>
            <Box sx={{ my: 4, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>Draft for {queue.name}</Typography>
                {queue.status === 'DRAFTING' ? (
                     <Typography variant="h6" color={isMyTurn ? 'primary' : 'text.secondary'}>
                        {isMyTurn ? "It's your turn to pick!" : `Waiting for ${profiles.get(queue.currentDrafter!)?.username || '...'} to pick...`}
                    </Typography>
                ) : (
                    <Typography variant="h5" color="success.main">Draft Complete! Match is In Progress.</Typography>
                )}
            </Box>

            <Grid container spacing={4}>
                <Grid item xs={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h5">Team {captainAProfile?.username}</Typography>
                        {queue.teamA?.map(p => <PlayerChip key={p} profile={profiles.get(p)!} />)}
                    </Paper>
                </Grid>
                <Grid item xs={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h5">Team {captainBProfile?.username}</Typography>
                        {queue.teamB?.map(p => <PlayerChip key={p} profile={profiles.get(p)!} />)}
                    </Paper>
                </Grid>

                {queue.status === 'DRAFTING' && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2, mt: 2 }}>
                            <Typography variant="h5">Draft Pool</Typography>
                            <List>
                                {queue.draftPool?.map(playerOwnerId => (
                                    <ListItem key={playerOwnerId} secondaryAction={
                                        isMyTurn && (
                                            <Button variant="contained" onClick={() => handlePickPlayer(playerOwnerId)}>
                                                Draft
                                            </Button>
                                        )
                                    }>
                                        <PlayerChip profile={profiles.get(playerOwnerId)!} />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Container>
    );
};

export default DraftPage;
