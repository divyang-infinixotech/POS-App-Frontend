import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '../../../api/dashboard.api';

export function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await dashboardApi.getDashboard();
      setData(resp.data || resp);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Stable: useCallback with [] returns same reference across renders
  // Using [] (not [fetch]) to avoid any theoretical re-run from unstable callback reference
  useEffect(() => {
    fetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refresh: fetch };
}
