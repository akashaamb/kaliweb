import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Container, CircularProgress, Paper, Grid, Button, Stack } from '@mui/material';
import { client } from '../services/api';
import type { Schema } from '../../amplify/data/resource';
import { useAuthenticator } from '@aws-amplify/ui-react';

const PlayerChip: React.FC<{ profile: Schema['UserProfile']['type'] | null }> = ({ profile }) => {
    return <Typography>{profile ? `${profile.username} (${profile.elo})` : 'Loading...'}</Typography>;
};

const MatchPage: React.FC = () => {
    const { queueId } = useParams();
    const { user } = useAuthenticator((context) => [context.user]);
    const navigate = useNavigate();

    const [queue, setQueue] = useState<Schema['Queue']['type'] | null>(null);
    const [profiles, setProfiles] = useState<Map<string, Schema['UserProfile']['type']>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isReporting, setIsReporting] = useState(false);
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
                if (queueErrors || !queueData) throw new Error('Could not fetch queue data.');
                
                if (queueData.players) {
                    const profilePromises = queueData.players
                        ?.filter((owner): owner is string => owner !== null && owner !== undefined)
                        .map(owner => client.models.UserProfile.get({ owner }));
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
    }, [queueId]);

    const calculateEloUpdate = async (winningTeam: 'A' | 'B') => {
        if (!queue?.teamA || !queue?.teamB) return;

        const K_FACTOR = 32;

        const getTeamAvgElo = (team: string[]) => {
            const totalElo = team.reduce((acc, ownerId) => {
                const profile = profiles.get(ownerId);
                return acc + (profile?.elo || 1000);
            }, 0);
            return totalElo / team.length;
        };

        const teamA_AvgElo = getTeamAvgElo(queue.teamA.filter((id): id is string => id !== null && id !== undefined));
        const teamB_AvgElo = getTeamAvgElo(queue.teamB.filter((id): id is string => id !== null && id !== undefined));

        const expectedScoreA = 1 / (1 + Math.pow(10, (teamB_AvgElo - teamA_AvgElo) / 400));
        const expectedScoreB = 1 / (1 + Math.pow(10, (teamA_AvgElo - teamB_AvgElo) / 400));

        const actualScoreA = winningTeam === 'A' ? 1 : 0;
        const actualScoreB = winningTeam === 'B' ? 1 : 0;

        const updatePromises: Promise<any>[] = [];

        for (const ownerId of queue.teamA.filter((id): id is string => id !== null && id !== undefined)) {
            const profile = profiles.get(ownerId);
            if (profile && profile.elo) {
                const newElo = profile.elo + K_FACTOR * (actualScoreA - expectedScoreA);
                updatePromises.push(client.models.UserProfile.update({
                    owner: profile.owner,
                    elo: Math.round(newElo),
                }));
            }
        }

        for (const ownerId of queue.teamB.filter((id): id is string => id !== null && id !== undefined)) {
            const profile = profiles.get(ownerId);
            if (profile && profile.elo) {
                const newElo = profile.elo + K_FACTOR * (actualScoreB - expectedScoreB);
                updatePromises.push(client.models.UserProfile.update({
                    owner: profile.owner,
                    elo: Math.round(newElo),
                }));
            }
        }
        
        await Promise.all(updatePromises);
        console.log("Elo ratings updated for all players.");
    };

    const handleReportWinner = async (winningTeam: 'A' | 'B') => {
        if (!queue || !queue.teamA || !queue.teamB) return;
        setIsReporting(true);

        try {
            // Create the Match record
            await client.models.Match.create({
                name: queue.name,
                teamA: queue.teamA.filter((id): id is string => id !== null && id !== undefined),
                teamB: queue.teamB.filter((id): id is string => id !== null && id !== undefined),
                status: 'COMPLETED',
                winningTeam: winningTeam,
            });

            // Archive the queue
            await client.models.Queue.update({
                id: queue.id,
                status: 'COMPLETED' as any, // Type assertion workaround
            });
            
            // Calculate and update Elo ratings
            await calculateEloUpdate(winningTeam);

            alert(`Match reported successfully. ${winningTeam === 'A' ? 'Team A' : 'Team B'} wins! Elo has been updated.`);
            navigate('/');

        } catch (err) {
            console.error("Error reporting winner:", err);
            alert("Failed to report match winner.");
        } finally {
            setIsReporting(false);
        }
    };
    
    if (isLoading) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!queue) return <Typography>Match not found.</Typography>;

    const isPlayerInMatch = user?.userId && queue.players?.includes(user.userId);

    return (
        <Container>
            <Box sx={{ my: 4, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>Match: {queue.name}</Typography>
                <Typography variant="h6" color="success.main">Match In Progress</Typography>
            </Box>

            <Grid container spacing={4}>
                <Grid item xs={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h5">Team A</Typography>
                        {queue.teamA?.filter((p): p is string => p !== null && p !== undefined).map(p => <PlayerChip key={p} profile={profiles.get(p)!} />)}
                    </Paper>
                </Grid>
                <Grid item xs={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h5">Team B</Typography>
                        {queue.teamB?.filter((p): p is string => p !== null && p !== undefined).map(p => <PlayerChip key={p} profile={profiles.get(p)!} />)}
                    </Paper>
                </Grid>
            </Grid>

            {isPlayerInMatch && queue.status === 'IN_PROGRESS' && (
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="h6">Report Match Result</Typography>
                    <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" disabled={isReporting} onClick={() => handleReportWinner('A')}>
                            Team A Wins
                        </Button>
                        <Button variant="contained" color="secondary" disabled={isReporting} onClick={() => handleReportWinner('B')}>
                            Team B Wins
                        </Button>
                    </Stack>
                </Box>
            )}
        </Container>
    );
};

export default MatchPage;
