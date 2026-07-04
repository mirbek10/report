import { Navigate, Outlet } from 'react-router-dom';
import { getStoredApiUrl } from '../api/client';

/** Пускает дальше только если API URL уже настроен */
export function RequireApiUrl() {
  return getStoredApiUrl() ? <Outlet /> : <Navigate to="/setup" replace />;
}
