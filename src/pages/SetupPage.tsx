import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ApiSetup } from '../components/ApiSetup';
import { setApiClient, getStoredApiUrl } from '../api/client';

export function SetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleConfirm = (url: string) => {
    setApiClient(url);
    queryClient.clear();
    navigate('/dashboard');
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <ApiSetup
      onConfirm={handleConfirm}
      onCancel={getStoredApiUrl() ? handleCancel : undefined}
    />
  );
}
