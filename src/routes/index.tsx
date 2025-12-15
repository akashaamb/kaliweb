import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LobbyPage from '../pages/LobbyPage';
import DraftPage from '../pages/DraftPage';
import MatchPage from '../pages/MatchPage';
import ProfilePage from '../pages/ProfilePage';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/draft/:queueId" element={<DraftPage />} />
      <Route path="/match/:queueId" element={<MatchPage />} />
      <Route path="/profile/:ownerId" element={<ProfilePage />} />
    </Routes>
  );
};

export default AppRoutes;
