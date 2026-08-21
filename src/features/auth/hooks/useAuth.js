import { useCallback, useState } from 'react';
import { useAuthStore } from '../../../store';

export function useAuth() {
  const { user, isAuthenticated, isUnlocked, error, login, logout, lockTerminal, clearError } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async (userId, password) => {
    setLoading(true);
    try {
      const email = userId.includes('@') ? userId : `${userId}@restaurant.com`;
      const success = await login(email, password);
      return success;
    } finally {
      setLoading(false);
    }
  }, [login]);

  return {
    user,
    isAuthenticated,
    isUnlocked,
    error,
    loading,
    login: handleLogin,
    logout,
    lockTerminal,
    clearError,
  };
}
