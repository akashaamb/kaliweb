import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Paper, List, ListItem, ListItemText, Button } from '@mui/material';
import { client } from '../services/api';
import type { Schema } from '../../amplify/data/resource';
import { useAuthenticator } from '@aws-amplify/ui-react';

const QueueList: React.FC = () => {
    const { user } = useAuthenticator((context) => [context.user]);
    const navigate = useNavigate();
    const [queues, setQueues] = useState<Schema['Queue']['type'][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchQueues = async () => {
            setIsLoading(true);
            try {
                const { data: queueList, errors } = await client.models.Queue.list({
                    // Filter for queues that are not yet completed
                    filter: {
                        or: [
                            { status: { eq: 'WAITING' } },
                            { status: { eq: 'DRAFTING' } },
                            { status: { eq: 'IN_PROGRESS' } },
                        ],
                    }
                });
                if (errors) throw errors;
                setQueues(queueList);
            } catch (err: any) {
                console.error('Error fetching queues:', err);
                setError(err.message || 'An error occurred while fetching queues.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchQueues();

        // const createSub = client.models.Queue.onCreate().subscribe({
        //     next: (newQueue) => setQueues((prevQueues) => [newQueue, ...prevQueues]),
        //     error: (err) => console.error('Subscription error on create queue:', err),
        // });

        const updateSub = client.models.Queue.onUpdate().subscribe({
            next: (updatedQueue) => {
                // If a queue moves to drafting, navigate
                if (updatedQueue.status === 'DRAFTING' && updatedQueue.players?.includes(user.userId)) {
                    navigate(`/draft/${updatedQueue.id}`);
                }
                setQueues((prevQueues) =>
                    prevQueues.map((q) => (q.id === updatedQueue.id ? updatedQueue : q))
                );
            },
            error: (err) => console.error('Subscription error on update queue:', err),
        });

        const deleteSub = client.models.Queue.onDelete().subscribe({
            next: (deletedQueue) => {
                setQueues((prevQueues) => prevQueues.filter((q) => q.id !== deletedQueue.id));
            },
            error: (err) => console.error('Subscription error on delete queue:', err),
        });

        return () => {
            // createSub.unsubscribe();
            updateSub.unsubscribe();
            deleteSub.unsubscribe();
        };
    }, [user, navigate]);

    const handleJoinQueue = async (queueId: string) => {
        if (!user?.userId) return;

        const queue = queues.find((q) => q.id === queueId);
        if (!queue || queue.players?.includes(user.userId)) return;

        const updatedPlayerList = [...(queue.players || []), user.userId];

        try {
            await client.models.Queue.update({
                id: queueId,
                players: updatedPlayerList,
            });
        } catch (err) {
            console.error('Error joining queue:', err);
        }
    };

    const handleStartMatch = async (queue: Schema['Queue']['type']) => {
        if (!queue.players || queue.players.length !== 8) {
            console.error("Cannot start match: queue is not full.");
            return;
        }

        try {
            // 1. Fetch all user profiles
            const profiles = await Promise.all(
                queue.players.map(owner => client.models.UserProfile.get({ owner }))
            );

            // Filter out any potential nulls and errors
            const validProfiles = profiles.map(p => p.data).filter(Boolean) as Schema['UserProfile']['type'][];
            
            if (validProfiles.length !== 8) {
                throw new Error("Could not fetch all player profiles.");
            }

            // 2. Sort by Elo
            validProfiles.sort((a, b) => (b.elo || 0) - (a.elo || 0));

            // 3. Assign captains and draft pool
            const captainA = validProfiles[0];
            const captainB = validProfiles[1];
            const draftPool = validProfiles.slice(2).map(p => p.owner);

            // 4. Update the queue
            await client.models.Queue.update({
                id: queue.id,
                status: 'DRAFTING',
                teamACaptain: captainA.owner,
                teamBCaptain: captainB.owner,
                teamA: [captainA.owner],
                teamB: [captainB.owner],
                draftPool: draftPool,
                currentDrafter: captainA.owner, // Captain A drafts first
            });

            // 5. Navigation is handled by the onUpdate subscription
        } catch (err) {
            console.error("Error starting match:", err);
        }
    };

    const handleLeaveQueue = async (queueId: string) => {
        if (!user?.userId) return;

        const queue = queues.find((q) => q.id === queueId);
        if (!queue || !queue.players?.includes(user.userId)) return;

        const updatedPlayerList = (queue.players || []).filter(
            (playerId) => playerId !== user.userId
        );

        try {
            await client.models.Queue.update({
                id: queueId,
                players: updatedPlayerList,
            });
        } catch (err) {
            console.error('Error leaving queue:', err);
        }
    };

    if (isLoading) return <CircularProgress />;
    if (error) return <Typography color="error">{error}</Typography>;

            return (
            <Paper elevation={2} sx={{ p: 2, mt: 4, bgcolor: 'background.paper' }}>
                <Typography variant="h5" gutterBottom>Active Queues</Typography>
                {queues.length === 0 ? (
                    <Typography>No active queues. Why not create one?</Typography>
                ) : (
                    <List sx={{ bgcolor: 'background.paper' }}>
                        {queues.map((queue) => (
                            <ListItem
                                key={queue.id}
                                sx={{
                                    bgcolor: 'background.paper',
                                    borderRadius: 1,
                                    mb: 1,
                                    transition: 'box-shadow 0.3s ease-in-out, background-color 0.3s ease-in-out',
                                    '&:hover': {
                                        boxShadow: '0px 0px 15px rgba(255, 255, 255, 0.2)', // White shadow on hover
                                        backgroundColor: '#282828', // Slightly darker on hover
                                    },
                                }}
                                secondaryAction={
                                    queue.players?.includes(user.userId) ? (
                                        <Button edge="end" variant="outlined" color="secondary" onClick={() => handleLeaveQueue(queue.id)}>
                                            Leave
                                        </Button>
                                    ) : (
                                        queue.players?.length === 8 ? (
                                            <Button edge="end" variant="contained" color="primary" onClick={() => handleStartMatch(queue)}>
                                                Start Match
                                            </Button>
                                        ) : (
                                            <Button edge="end" variant="outlined" onClick={() => handleJoinQueue(queue.id)}>
                                                Join
                                            </Button>
                                        )
                                    )
                                }
                            >
                                <ListItemText
                                    primaryTypographyProps={{ color: 'text.primary' }}
                                    secondaryTypographyProps={{ color: 'text.secondary' }}
                                    primary={queue.name}
                                    secondary={`Players: ${queue.players?.length || 0} / 8 | Status: ${queue.status}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>
        );};

export default QueueList;
