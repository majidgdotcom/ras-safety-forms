import { fetchAuthSession, signIn, signOut } from 'aws-amplify/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { COGNITO_GROUP, MeDto, Role } from '@ras/shared';

import { api } from '@/config/api-client';

interface AuthState {
  user: MeDto | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Read who the user is from the Cognito ID token (already verified by Cognito). */
async function loadUserFromSession(): Promise<MeDto | null> {
  const session = await fetchAuthSession();
  const claims = session.tokens?.idToken?.payload;
  if (!claims) return null;

  const groups = (claims['cognito:groups'] as string[] | undefined) ?? [];
  const role = groups.includes(COGNITO_GROUP[Role.ADMIN])
    ? Role.ADMIN
    : groups.includes(COGNITO_GROUP[Role.FRAMER])
      ? Role.FRAMER
      : null;
  if (!role) throw new Error('Your account has no role yet. Ask a supervisor to add you to a group.');

  return {
    userId: String(claims.sub),
    email: String(claims.email ?? ''),
    name: String(claims.name ?? claims.email ?? ''),
    role,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MeDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserFromSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await signIn({ username: email.trim().toLowerCase(), password });
    if (!result.isSignedIn) {
      // e.g. CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED for accounts created with a temp password
      throw new Error('This account needs a password reset. Please contact your supervisor.');
    }
    try {
      const me = await loadUserFromSession();
      setUser(me);
      // Let the API create/refresh this user's profile row (used by the admin dashboard).
      api.get('/me').catch(() => undefined);
    } catch (err) {
      await signOut();
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
