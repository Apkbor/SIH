import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './Topbar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--ink-primary)' }}>
      {/* Left rail — E1 glass */}
      <div className={`transition-all duration-300 flex-shrink-0 ${sidebarOpen ? 'w-60' : 'w-0'} overflow-hidden`}>
        <Sidebar currentPath={location.pathname} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
          <div className="max-w-[1440px] mx-auto p-4 sm:p-6" style={{ padding: '24px' }}>
            <div key={location.pathname} className="page-enter">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
