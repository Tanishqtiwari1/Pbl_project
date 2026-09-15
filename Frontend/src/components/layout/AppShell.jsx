import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setCollapsed((value) => !value)} />
      <div className="app-main">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}