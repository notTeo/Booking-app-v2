import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/sidebar.css';

function IconOverview() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function IconBilling() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="3.5" width="14" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="6.5" width="14" height="2" />
      <rect x="3" y="10" width="3.5" height="1.25" rx="0.5" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      <path fillRule="evenodd" d="M6.56 1.28a1 1 0 0 1 2.88 0l.24.83a.75.75 0 0 0 1.02.49l.8-.35a1 1 0 0 1 1.28 1.28l-.35.8a.75.75 0 0 0 .49 1.02l.83.24a1 1 0 0 1 0 2.88l-.83.24a.75.75 0 0 0-.49 1.02l.35.8a1 1 0 0 1-1.28 1.28l-.8-.35a.75.75 0 0 0-1.02.49l-.24.83a1 1 0 0 1-2.88 0l-.24-.83a.75.75 0 0 0-1.02-.49l-.8.35a1 1 0 0 1-1.28-1.28l.35-.8a.75.75 0 0 0-.49-1.02l-.83-.24a1 1 0 0 1 0-2.88l.83-.24a.75.75 0 0 0 .49-1.02l-.35-.8a1 1 0 0 1 1.28-1.28l.8.35a.75.75 0 0 0 1.02-.49l.24-.83zm1.44 1.17-.18.63a2.25 2.25 0 0 1-3.06 1.47l-.6-.26-.26.6a2.25 2.25 0 0 1-1.47 3.06l-.63.18.18.63a2.25 2.25 0 0 1 1.47 3.06l-.26.6.6.26a2.25 2.25 0 0 1 3.06 1.47l.18.63h.63l.18-.63a2.25 2.25 0 0 1 3.06-1.47l.6.26.26-.6a2.25 2.25 0 0 1 1.47-3.06l.63-.18-.18-.63a2.25 2.25 0 0 1-1.47-3.06l.26-.6-.6-.26a2.25 2.25 0 0 1-3.06-1.47l-.18-.63H8z" clipRule="evenodd" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="10 12 6 8 10 4" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 4 10 8 6 12" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Το σώμα της "πόρτας" */}
      <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v7A1.5 1.5 0 0 0 3.5 13H6" />
      {/* Το βέλος εξόδου */}
      <path d="M10 11l3-3-3-3" />
      <path d="M14 8H6" />
    </svg>
  );
}

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className='sidebar-header'>
        <h4 className='sidebar-link-label'>Auth Boilerplate</h4>
        <button
          className="sidebar-toggle"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
        {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
      </button>
      </div>
      

      <span className="sidebar-section-label">App</span>

      <NavLink
        to="/dashboard"
        end
        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
        title={collapsed ? 'Overview' : undefined}
      >
        <IconOverview />
        <span className="sidebar-link-label">Overview</span>
      </NavLink>

      <NavLink
        to="/billing"
        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
        title={collapsed ? 'Billing' : undefined}
      >
        <IconBilling />
        <span className="sidebar-link-label">Billing</span>
      </NavLink>

      <span className="sidebar-section-label">Account</span>

      <NavLink
        to="/settings"
        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
        title={collapsed ? 'Settings' : undefined}
      >
        <IconSettings />
        <span className="sidebar-link-label">Settings</span>
      </NavLink>

      <button
          className="sidebar-logout sidebar-link"
          onClick={async () => { await logout(); navigate('/login'); }}
        >
          <IconLogout/>
          <span className="sidebar-link-label">Logout</span>
        </button>

        
    </aside>
  );
}
