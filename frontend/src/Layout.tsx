import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* --- NAVIGATION BAR --- */}
      <nav className="bg-slate-900 text-white p-4 flex gap-6 shadow-md">
        <Link to="/" className="font-bold hover:text-blue-400">Home</Link>
        <Link to="/dashboard" className="hover:text-blue-400">Dashboard</Link>
      </nav>

      {/* --- PAGE CONTENT --- */}
      <main className="flex-1">
        {/* The Outlet is where the current page component renders */}
        <Outlet />
      </main>
    </div>
  );
}