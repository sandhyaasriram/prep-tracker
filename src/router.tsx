/**
 * React Router configuration — browser paths + OAuth callback.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from '@/App';
import { ToastHost } from '@/components/ui/ToastHost';
import { GoogleOAuthCallbackPage } from '@/pages/GoogleOAuthCallbackPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <ToastHost />
      <Routes>
        <Route path="/auth/google/callback" element={<GoogleOAuthCallbackPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}
