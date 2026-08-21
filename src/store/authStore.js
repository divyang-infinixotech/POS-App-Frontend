import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import { subscriptionApi } from '../api/subscription.api';
import {
  canAccessScreen,
  canPerformAction,
  getAccessibleScreens,
  getRoleDisplayName,
  getDefaultScreenForRole,
  hasFeature,
} from '../utils/permissions';

// ─── Persistence keys ───────────────────────────────────────────────────────
const STORAGE_KEY_TOKEN = 'pos_token';
const STORAGE_KEY_USER = 'pos_user';
const STORAGE_KEY_FAILED_ATTEMPTS = 'pos_failed_unlock_attempts';
const STORAGE_KEY_LOCKOUT_UNTIL = 'pos_lockout_until';
const STORAGE_KEY_PREVIOUS_SCREEN = 'pos_previous_screen';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/** Load serialized user from localStorage (returns null on parse failure) */
function loadStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY_USER);
    return null;
  }
}

/** Load failed unlock attempts from localStorage */
function loadFailedAttempts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAILED_ATTEMPTS);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

/** Load lockout expiration from localStorage */
function loadLockoutUntil() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCKOUT_UNTIL);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

// ─── Idempotency guard for StrictMode ───────────────────────────────────────
let restoreSessionPromise = null;

const useAuthStore = create((set, get) => ({
  // State
  user: loadStoredUser(),
  subscription: null, // live subscription snapshot (plan, limits, features) — never cached, refreshed at login/profile
  token: localStorage.getItem(STORAGE_KEY_TOKEN) || null,
  isAuthenticated: !!localStorage.getItem(STORAGE_KEY_TOKEN),
  isUnlocked: !!localStorage.getItem(STORAGE_KEY_TOKEN),
  loading: false,
  error: null,
  sessionReady: false, // true after restoreSession completes

  // Unlock security state
  failedUnlockAttempts: loadFailedAttempts(),
  lockoutUntil: loadLockoutUntil(),
  previousScreen: localStorage.getItem(STORAGE_KEY_PREVIOUS_SCREEN) || 'dashboard',

  // ── Role-based permission helpers (computed from user.role) ──
  
  /** Check if current user can access a screen */
  canAccessScreen: (screen) => {
    const { user } = get();
    if (!user) return false;
    return canAccessScreen(user.role, screen);
  },

  /** Check if current user can perform an action */
  can: (action) => {
    const { user } = get();
    if (!user) return false;
    return canPerformAction(user.role, action);
  },

  /** Get all screens the current user can access */
  getAccessibleScreens: () => {
    const { user } = get();
    if (!user) return [];
    return getAccessibleScreens(user.role);
  },

  /** Get the user's role display name */
  getRoleDisplay: () => {
    const { user } = get();
    if (!user) return '';
    return getRoleDisplayName(user.role);
  },

  /** Get the default landing screen for the current user's role */
  getDefaultScreen: () => {
    const { user } = get();
    if (!user) return 'dashboard';
    return getDefaultScreenForRole(user.role);
  },

  /**
   * Check whether the current restaurant's plan includes a feature.
   * SUPER_ADMIN always has access to everything.
   */
  hasFeature: (feature) => {
    const { user, subscription } = get();
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return hasFeature(subscription, feature);
  },

  /** Check if user has admin-level access (SUPER_ADMIN or ADMIN) */
  isAdmin: () => {
    const { user } = get();
    if (!user) return false;
    const role = user.role.toUpperCase();
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  },

  /** Check if user can manage staff (SUPER_ADMIN, ADMIN, MANAGER) */
  canManageStaff: () => {
    const { user } = get();
    if (!user) return false;
    const role = user.role.toUpperCase();
    return ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);
  },

  /** Check if user can manage menu (SUPER_ADMIN, ADMIN, MANAGER) */
  canManageMenu: () => {
    const { user } = get();
    if (!user) return false;
    const role = user.role.toUpperCase();
    return ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);
  },

  /** Get remaining lockout time in seconds (0 if not locked out) */
  getLockoutRemaining: () => {
    const { lockoutUntil } = get();
    if (!lockoutUntil) return 0;
    const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
    return Math.max(0, remaining);
  },

  /** Check if currently locked out */
  isLockedOut: () => {
    const { lockoutUntil } = get();
    return lockoutUntil > 0 && Date.now() < lockoutUntil;
  },

  // ── Auth Actions ──

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const resp = await authApi.login(email, password);
      if (resp.success && resp.token) {
        localStorage.setItem(STORAGE_KEY_TOKEN, resp.token);
        if (resp.user) {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(resp.user));
        }
        set({
          token: resp.token,
          user: resp.user,
          subscription: resp.subscription || null,
          isAuthenticated: true,
          isUnlocked: true,
          loading: false,
          sessionReady: true,
        });
        return true;
      }
      set({ error: 'Invalid credentials', loading: false });
      return false;
    } catch (e) {
      set({ error: e.message, loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_FAILED_ATTEMPTS);
    localStorage.removeItem(STORAGE_KEY_LOCKOUT_UNTIL);
    localStorage.removeItem(STORAGE_KEY_PREVIOUS_SCREEN);
    // Reset idempotency guard so restoreSession works again after re-login
    restoreSessionPromise = null;
    set({
      user: null,
      token: null,
      subscription: null,
      isAuthenticated: false,
      isUnlocked: false,
      sessionReady: true,
      failedUnlockAttempts: 0,
      lockoutUntil: 0,
    });
  },

  /**
   * Called once on app boot to validate the stored JWT and rehydrate user.
   * IDEMPOTENT: Under StrictMode (double-mount), the second call returns the
   * same promise as the first, ensuring only ONE /api/auth/profile request.
   */
  restoreSession: async () => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (!token) {
      set({ sessionReady: true });
      return;
    }

    // If restoreSession is already in progress, return the existing promise.
    // This prevents duplicate API calls under StrictMode double-mounting.
    if (restoreSessionPromise) {
      return restoreSessionPromise;
    }

    restoreSessionPromise = (async () => {
      try {
        const resp = await authApi.profile();
        if (resp.success && resp.user) {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(resp.user));
          set({
            user: resp.user,
            subscription: resp.subscription || null,
            token,
            isAuthenticated: true,
            isUnlocked: true,
            sessionReady: true,
          });
        } else {
          // Token invalid — force logout
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          localStorage.removeItem(STORAGE_KEY_USER);
          set({
            user: null,
            token: null,
            subscription: null,
            isAuthenticated: false,
            isUnlocked: false,
            sessionReady: true,
          });
        }
      } catch (e) {
        // Network error — keep stored state, user stays logged in
        set({ sessionReady: true });
      } finally {
        restoreSessionPromise = null;
      }
    })();

    return restoreSessionPromise;
  },

  /**
   * Lock the terminal and save the current screen so it can be restored after unlock.
   */
  lockTerminal: (currentScreen) => {
    if (currentScreen) {
      localStorage.setItem(STORAGE_KEY_PREVIOUS_SCREEN, currentScreen);
      set({ previousScreen: currentScreen });
    }
    localStorage.removeItem(STORAGE_KEY_FAILED_ATTEMPTS);
    localStorage.removeItem(STORAGE_KEY_LOCKOUT_UNTIL);
    set({ isUnlocked: false, failedUnlockAttempts: 0, lockoutUntil: 0 });
  },

  unlockTerminal: () => {
    // Reset failed attempts on successful unlock
    localStorage.removeItem(STORAGE_KEY_FAILED_ATTEMPTS);
    localStorage.removeItem(STORAGE_KEY_LOCKOUT_UNTIL);
    set({
      isUnlocked: true,
      failedUnlockAttempts: 0,
      lockoutUntil: 0,
    });
  },

  /**
   * Verify password against the backend.
   * Returns { success: boolean, message?: string }
   */
  verifyPassword: async (password) => {
    const state = get();
    
    // Check lockout first
    if (state.isLockedOut()) {
      const remaining = state.getLockoutRemaining();
      return {
        success: false,
        message: `Too many failed attempts. Try again in ${Math.ceil(remaining / 60)} minute(s).`
      };
    }

    try {
      const resp = await authApi.verifyPassword(password);
      if (resp.success) {
        return { success: true };
      }
      return { success: false, message: resp.message || 'Invalid password' };
    } catch (e) {
      const errorMsg = e.message || 'Invalid password';
      
      // Increment failed attempts
      const newAttempts = state.failedUnlockAttempts + 1;
      localStorage.setItem(STORAGE_KEY_FAILED_ATTEMPTS, String(newAttempts));
      
      let lockoutUntil = 0;
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        localStorage.setItem(STORAGE_KEY_LOCKOUT_UNTIL, String(lockoutUntil));
        set({ failedUnlockAttempts: newAttempts, lockoutUntil });
        return {
          success: false,
          message: `Too many failed attempts. Terminal locked for 5 minutes.`
        };
      }
      
      set({ failedUnlockAttempts: newAttempts });
      return {
        success: false,
        message: `${errorMsg} (${newAttempts}/${MAX_FAILED_ATTEMPTS} attempts)`
      };
    }
  },

  /**
   * Change the authenticated user's own password (self-service).
   * Verifies the current password on the backend, hashes the new one,
   * and records passwordChangedAt. The caller must then force a logout.
   * Returns { success: boolean, message?: string }
   */
  changePassword: async (currentPassword, newPassword) => {
    try {
      const resp = await authApi.changePassword(currentPassword, newPassword);
      if (resp.success) {
        return { success: true };
      }
      return { success: false, message: resp.message || 'Failed to change password' };
    } catch (e) {
      return { success: false, message: e.message || 'Failed to change password' };
    }
  },

  /**
   * Merge updated profile fields into the store + localStorage so the UI
   * updates immediately and survives a refresh — no logout required.
   * Used by the Super Admin Edit Profile flow.
   */
  updateProfile: (profile) => {
    const current = get().user || {};
    const updated = { ...current, ...profile };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    set({ user: updated });
  },

  clearError: () => set({ error: null }),

  /**
   * Re-fetch the live subscription snapshot from the backend and update the
   * store. Called after a successful subscription purchase so the header pill,
   * sidebar modules, route guards and feature checks all refresh immediately.
   * Returns true on success.
   */
  refreshSubscription: async () => {
    try {
      const resp = await subscriptionApi.refresh();
      if (resp.success && resp.data) {
        set({ subscription: resp.data });
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },
}));

export { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS };
export default useAuthStore;
