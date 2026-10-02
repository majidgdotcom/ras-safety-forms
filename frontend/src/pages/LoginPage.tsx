import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';

import { Alert } from '@/components/common/Feedback';
import { useAuth } from '@/hooks/useAuth';

const LoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type LoginForm = z.infer<typeof LoginSchema>;

/** Turn Cognito error names into plain messages. */
function friendlyAuthError(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAuthorizedException' || name === 'UserNotFoundException') {
    return 'Wrong email or password.';
  }
  if (name === 'UserAlreadyAuthenticatedException') return 'You are already signed in. Refresh the page.';
  if (name === 'NetworkError') return 'No connection. Check your signal and try again.';
  return err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
}

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(LoginSchema) });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(undefined);
    try {
      await login(email, password);
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  });

  return (
    <main className="login">
      <div className="login__card">
        <div className="login__brand">
          <img src="/ras-logo-green.png" alt="RAS - Ron Anderson & Sons" />
          <h1 style={{ marginTop: 10 }}>Site Safety</h1>
          <p>Sign in with your RAS account</p>
        </div>

        <form onSubmit={onSubmit} noValidate>
          {error && (
            <div style={{ marginBottom: 14 }}>
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          <div className={`field${errors.email ? ' has-error' : ''}`}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="username"
              inputMode="email"
              {...register('email')}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>
          <div className={`field${errors.password ? ' has-error' : ''}`}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
          </div>
          <button
            type="submit"
            className="btn btn--primary btn--block btn--lg"
            style={{ marginTop: 20 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="small muted" style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
          No account? Ask your site supervisor.
        </p>
      </div>
    </main>
  );
};
