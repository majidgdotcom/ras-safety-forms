import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { Role } from '@ras/shared';

import { useAuth } from '@/hooks/useAuth';

import { Spinner } from './Feedback';

/**
 * Only renders children for a logged-in user with the right role.
 * NOTE: this is for UX only - the API enforces roles on every request.
 */
export const ProtectedRoute: React.FC<{ role?: Role; children: React.ReactNode }> = ({
  role,
  children,
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/** "/" sends each role to its home page. */
export const HomeRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === Role.ADMIN ? '/admin' : '/form'} replace />;
};
