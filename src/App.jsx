import { Routes, Route, Navigate } from 'react-router-dom';
import TournamentsPage from './pages/TournamentsPage';
import TournamentLayout from './pages/TournamentLayout';
import TeamsPage from './pages/TeamsPage';
import DrawPage from './pages/DrawPage';
import ScorePage from './pages/ScorePage';
import TablePage from './pages/TablePage';
import ViewPage from './pages/ViewPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TournamentsPage />} />
      <Route path="/view/:id" element={<ViewPage />} />
      <Route path="/t/:id" element={<TournamentLayout />}>
        <Route index element={<Navigate to="teams" replace />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="draw" element={<DrawPage />} />
        <Route path="score" element={<ScorePage />} />
        <Route path="table" element={<TablePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
