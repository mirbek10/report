import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireApiUrl } from './router/guards';
import { SetupPage } from './pages/SetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { getStoredApiUrl, setApiClient } from './api/client';

// Rehydrate API client singleton on app load
const stored = getStoredApiUrl();
if (stored) setApiClient(stored);

export default function App() {
  return (
    <Routes>
      <Route
        index
        element={<Navigate to={getStoredApiUrl() ? '/dashboard' : '/setup'} replace />}
      />

      <Route path="/setup" element={<SetupPage />} />

      <Route element={<RequireApiUrl />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
