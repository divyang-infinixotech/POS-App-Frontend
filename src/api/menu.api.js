import apiClient from './axios';

export const menuApi = {
  getAll: () => apiClient.get('/menu'),
  getById: (id) => apiClient.get(`/menu/${id}`),
  create: (data) => apiClient.post('/menu', data),
  update: (id, data) => apiClient.put(`/menu/${id}`, data),
  delete: (id) => apiClient.delete(`/menu/${id}`),
  duplicate: (id) => apiClient.post(`/menu/${id}/duplicate`),
  toggleAvailability: (id, isAvailable) => apiClient.patch(`/menu/${id}/status`, { isAvailable }),
  /** Upload a menu item image (multipart, field name: image) → { imageUrl, imagePublicId } */
  uploadImage: (formData) => apiClient.post('/menu/image', formData),
  /** Delete an unbound uploaded image by its publicId */
  deleteImage: (imagePublicId) => apiClient.delete('/menu/image', { data: { imagePublicId } }),
};

export default menuApi;