import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Role } from '@ras/shared';

import { HomeRedirect, ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { configureAmplify } from '@/config/amplify';
import { ApiError } from '@/config/api-client';
import { AuthProvider } from '@/hooks/useAuth';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { SubmissionsPage } from '@/pages/admin/SubmissionsPage';
import { MySubmissionsPage } from '@/pages/framer/MySubmissionsPage';
import { NewSubmissionPage } from '@/pages/framer/NewSubmissionPage';
import { LoginPage } from '@/pages/LoginPage';
import { SubmissionDetailPage } from '@/pages/SubmissionDetailPage';

configureAmplify();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      // Don't retry errors the user can't fix by waiting (403, 404, validation...)
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

/**
 * Routes:
 *  /login                      everyone
 *  /form, /my-forms[/:id]      Framer
 *  /admin, /admin/submissions[/:id]  Admin
 */
const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomeRedirect />} />

          <Route
            element={
              <ProtectedRoute role={Role.FRAMER}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/form" element={<NewSubmissionPage />} />
            <Route path="/my-forms" element={<MySubmissionsPage />} />
            <Route path="/my-forms/:submissionId" element={<SubmissionDetailPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute role={Role.ADMIN}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/submissions" element={<SubmissionsPage />} />
            <Route path="/admin/submissions/:submissionId" element={<SubmissionDetailPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
