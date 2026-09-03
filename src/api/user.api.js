import apiClient from './axios';

export const userApi = {
  getAll: () => apiClient.get('/users'),
  // Waiter directory for the Take Order wizard (any order-placing role may call it)
  getWaiters: () => apiClient.get('/users/waiters'),
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
  changeStatus: (id, isActive) =>
    apiClient.patch(`/users/${id}/status`, { isActive }),
  changePassword: (id, newPassword) =>
    apiClient.patch(`/users/${id}/password`, { newPassword }),
};

export default userApi;
