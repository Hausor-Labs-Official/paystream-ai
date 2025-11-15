'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import PennyOrbButton from '@/components/penny/PennyOrbButton';
import PennyPanel from '@/components/penny/PennyPanel';
import { SearchModal } from '@/components/modals/SearchModal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pennyOpen, setPennyOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Fixed Left Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 z-40">
        <Sidebar
          collapsed={pennyOpen ? true : sidebarCollapsed}
          onSearchClick={() => setSearchOpen(true)}
        />
      </div>

      {/* Main Content Area with Topbar */}
      <div className="flex-1 transition-all duration-300" style={{
        marginLeft: pennyOpen ? '4rem' : (sidebarCollapsed ? '4rem' : '16rem'),
        marginRight: pennyOpen ? '28rem' : '0'
      }}>
        {/* Fixed Topbar - Beside sidebar, not over it */}
        <div className="sticky top-0 z-30 bg-white">
          <Topbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        </div>

        {/* Main Content */}
        <main className="flex-1 bg-white">
          {children}
        </main>
      </div>

      {/* Penny Orb Button - Bottom right corner */}
      <PennyOrbButton isOpen={pennyOpen} onToggle={() => setPennyOpen(!pennyOpen)} />

      {/* Right Side Penny Panel */}
      <PennyPanel isOpen={pennyOpen} onClose={() => setPennyOpen(false)} />

      {/* Search Modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
