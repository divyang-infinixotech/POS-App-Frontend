import apiClient from './axios';

export const settingApi = {
  get: () => apiClient.get('/settings'),
  save: (data) => apiClient.post('/settings', data),
  uploadLogo: (formData) => apiClient.post('/settings/logo', formData),
  deleteLogo: () => apiClient.delete('/settings/logo'),
};

export default settingApi;
