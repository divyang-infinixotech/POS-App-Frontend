import React, { useState, useEffect } from 'react';
import { Languages } from 'lucide-react';
import { useAuthStore, useUiStore, useSettingsStore } from '../../../store';
import LoginForm from '../components/LoginForm';
import { getDefaultScreenForRole } from '../../../utils/permissions';

export default function LoginPage() {
  const { error, clearError, user } = useAuthStore();
  const { language, setLanguage } = useUiStore();
  const { settings } = useSettingsStore();
  const { login, isUnlocked } = useAuthStore();
  const { setScreen, setUnlocked } = useUiStore();

  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already unlocked — use role-specific default screen
  useEffect(() => {
    if (isUnlocked && user) {
      const defaultScreen = getDefaultScreenForRole(user.role);
      setScreen(defaultScreen);
    }
  }, [isUnlocked, user, setScreen]);

  // Sync store error
  useEffect(() => {
    if (error) {
      setLocalError(error);
      clearError();
    }
  }, [error, clearError]);

  const handleLogin = async (userId, password) => {
    if (!userId || !password) {
      setLocalError('Please enter both User ID and Password.');
      return;
    }
    setLoading(true);
    setLocalError('');
    try {
      const email = userId.includes('@') ? userId : `${userId}@restaurant.com`;
      const success = await login(email, password);
      if (success) {
        setUnlocked(true);
        // Load the restaurant's persisted settings from the database right after
        // login so all module/visibility toggles apply immediately (requirement:
        // settings load automatically on login, no frontend-only state).
        useSettingsStore.getState().fetchSettings();
        // Role-based redirect — happens in the isUnlocked useEffect above
        // after user is populated by login().
      } else {
        setLocalError('Incorrect User ID or Password. Please try again.');
      }
    } catch (e) {
      setLocalError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 select-none font-sans">
      <div className="mb-6 flex flex-col items-center text-center animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#16A34A] rounded-[14px] flex items-center justify-center shadow-md border border-white/20">
            <span className="text-white text-2xl font-extrabold font-serif">G</span>
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#16A34A] uppercase leading-none">
              {settings.branding.restaurantName || 'Restaurant POS'} <span className="text-[#16A34A]">POS</span>
            </h1>
            <p className="text-[10px] text-[#16A34A]/80 font-bold uppercase tracking-wider mt-1">
              TERMINAL SECURE LOGIN
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[400px] bg-white rounded-[20px] shadow-[0_12px_40px_rgba(44,62,80,0.08)] border border-slate-200 p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#2C3E50]">
            <Languages className="w-4 h-4 text-[#16A34A]" />
            <span>Select Language</span>
          </div>
          <div className="flex bg-[#F8FAFC] p-0.5 rounded-lg border border-slate-200">
            {(['English', 'Hindi', 'Gujarati']).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  language === lang 
                    ? 'bg-[#16A34A] text-white shadow-xs' 
                    : 'text-[#2C3E50]/70 hover:text-[#2C3E50]'
                }`}
              >
                {lang === 'English' ? 'EN' : lang === 'Hindi' ? 'HI' : 'GJ'}
              </button>
            ))}
          </div>
        </div>

        <LoginForm onSubmit={handleLogin} loading={loading} error={localError} />
      </div>
    </div>
  );
}
