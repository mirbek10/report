import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AttendanceDashboard } from '../components/AttendanceDashboard';
import { clearApiUrl } from '../api/client';

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleChangeApi = () => {
    clearApiUrl();
    queryClient.clear();
    navigate('/setup');
  };

  return <AttendanceDashboard onChangeApi={handleChangeApi} />;
}
