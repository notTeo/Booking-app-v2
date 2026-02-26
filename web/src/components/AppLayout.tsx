import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="5" x2="17" y2="5" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="15" x2="17" y2="15" />
    </svg>
  );
}

export default function AppLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile-only top header */}
      <header className="app-mobile-header">
        <button
          className="hamburger-btn"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open menu"
        >
          <IconMenu />
        </button>
        <span className="app-mobile-brand">BOOKLY</span>
      </header>

      {/* Backdrop — mobile only, only when drawer is open */}
      {isDrawerOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <div className="app-body">
        <Sidebar
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}