import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#f4f0e8' }}>
      <Outlet />
    </div>
  );
}