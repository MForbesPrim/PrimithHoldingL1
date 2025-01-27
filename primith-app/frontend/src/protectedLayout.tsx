import { Outlet } from 'react-router-dom';
import { useTokenRefresh } from './hooks/useTokenRefresh';

export function ProtectedLayout() {
  useTokenRefresh();
  
  return (
    <div>
      <Outlet />
    </div>
  );
}