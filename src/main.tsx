/**
 * Main React entry point for Placement OS.
 * Initializes theme detection and renders the root App.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from '@/router';
import { initializeTheme } from '@/lib/theme';
import './styles/tailwind.css';

initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
