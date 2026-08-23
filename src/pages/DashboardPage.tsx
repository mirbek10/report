import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AttendanceDashboard } from '../components/AttendanceDashboard';
import { clearApiUrl } from '../api/client';

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleChangeApi = () => {
    // Don't clear the API URL — user might have clicked by accident
    // The API URL is only replaced when user saves a new one in ApiSetup
    queryClient.clear();
    navigate('/setup');
  };

  return <AttendanceDashboard onChangeApi={handleChangeApi} />;
}
