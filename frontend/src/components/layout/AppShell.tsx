import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { Role } from '@ras/shared';

import { useAuth } from '@/hooks/useAuth';

const NAV: Record<Role, { to: string; label: string; end?: boolean }[]> = {
  [Role.FRAMER]: [
    { to: '/form', label: 'New safety form' },
    { to: '/my-forms', label: 'My forms' },
  ],
  [Role.ADMIN]: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/submissions', label: 'Submissions' },
  ],
};

/** Header (RAS logo + user) and role-based navigation around every logged-in page. */
export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <>
      <header className="app-header">
        <div className="app-header__bar">
          <Link to="/" className="brand" aria-label="RAS Site Safety home">
            <img src="/ras-logo-white.png" alt="RAS - Ron Anderson & Sons" />
            <span className="brand__title">Site Safety</span>
          </Link>
          <div className="app-header__user">
            <span className="who">
              {user.name}
              <small>{user.role === Role.ADMIN ? 'Admin' : 'Framer'}</small>
            </span>
            <button type="button" className="btn btn--ghost-light" onClick={() => logout()}>
              Sign out
            </button>
          </div>
        </div>
        <nav className="app-nav" aria-label="Main">
          <ul>
            {NAV[user.role].map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <Outlet />
    </>
  );
};
