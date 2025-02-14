import { Outlet } from 'react-router-dom';

export function ProtectedLayout() {
  
  return (
    <div>
      <Outlet />
    </div>
  );
}