import React from 'react';

import { ApiError } from '@/config/api-client';

export const Spinner: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="center" role="status">
    <div className="spinner" />
    <span>{label}</span>
  </div>
);

export const Alert: React.FC<{
  kind: 'error' | 'success' | 'info';
  children: React.ReactNode;
}> = ({ kind, children }) => (
  <div className={`alert alert--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
    {children}
  </div>
);

/** Shows a friendly message for any thrown error. */
export const ErrorMessage: React.FC<{ error: unknown; onRetry?: () => void }> = ({
  error,
  onRetry,
}) => {
  const message =
    error instanceof ApiError || error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <Alert kind="error">
      {message}{' '}
      {onRetry && (
        <button type="button" className="link-btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </Alert>
  );
};

export const EmptyState: React.FC<{ title: string; children?: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="center">
    <strong style={{ color: 'var(--text)' }}>{title}</strong>
    {children}
  </div>
);
