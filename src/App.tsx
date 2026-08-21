import React, { useEffect, useRef } from 'react';
import { useAuthStore, useSettingsStore } from './store';
import AppShell from './components/layout/app-shell/AppShell';

export default function App() {
  const { fetchSettings, lastFetched } = useSettingsStore();
  const initialLoadDone = useRef(false);

  // Auto-load settings on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('pos_token');
    if (token && !initialLoadDone.current) {
      initialLoadDone.current = true;

      // Fetch settings only if not already cached (within last 60s)
      if (!lastFetched || Date.now() - lastFetched > 60000) {
        fetchSettings();
      }
    }
  }, []);

  return <AppShell />;
}
