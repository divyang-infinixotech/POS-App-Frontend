import { authApi } from '../../../api/auth.api';
import { useAuthStore } from '../../../store';
import { useSettingsStore } from '../../../store';

export const loginService = async (email, password) => {
  const resp = await authApi.login(email, password);
  if (resp.success && resp.token) {
    // Update settings from login response (avoids a separate API call)
    if (resp.settings) {
      useSettingsStore.getState().updateSettings?.({
        branding: {
          ...useSettingsStore.getState().settings.branding,
          restaurantName: resp.settings.restaurantName,
        },
        gstNumber: resp.settings.gstNumber,
        address: resp.settings.address,
        contactNumber: resp.settings.phone,
        email: resp.settings.email,
      });
      // Skip fetchSettings here — App.tsx already calls it after unlock
    }
  }
  return resp;
};
