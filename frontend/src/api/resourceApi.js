import api from './axiosInstance';

const BASE_PATH = '/resources';

/**
 * Resolves the image URL. 
 * Since Cloudinary returns a full HTTPS URL, this will return it as-is.
 * If it's a legacy local path, it appends the base URL.
 */
export const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${url}`;
};

export const resourceApi = {
  getAll: (params = {}) =>
    api.get(BASE_PATH, { params }).then(res => res.data),

  getById: (id) =>
    api.get(`${BASE_PATH}/${id}`).then(res => res.data),

  getByQrCode: (qrCode) =>
    api.get(`${BASE_PATH}/qr/${qrCode}`).then(res => res.data),

  create: (data) =>
    api.post(BASE_PATH, data).then(res => res.data),

  update: (id, data) =>
    api.put(`${BASE_PATH}/${id}`, data).then(res => res.data),

  delete: (id) =>
    api.delete(`${BASE_PATH}/${id}`).then(res => res.data),

  updateStatus: (id, status) =>
    api.patch(`${BASE_PATH}/${id}/status`, null, { params: { status } }).then(res => res.data),

  /**
   * PROPER CLOUDINARY UPLOAD:
   * Sends the file to the Spring Boot backend, which then uploads to Cloudinary.
   */
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append('file', file); // 'file' must match the @RequestParam in your Spring Boot controller
    
    return api.post(`${BASE_PATH}/${id}/image`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data' 
      },
    }).then(res => res.data);
  },

  getMaintenanceDue: () =>
    api.get(`${BASE_PATH}/maintenance/due`).then(res => res.data),

  markMaintenanceDone: (id) =>
    api.post(`${BASE_PATH}/${id}/maintenance/done`).then(res => res.data),

  getAvailability: (id, weekStart) =>
    api.get(`${BASE_PATH}/${id}/availability`, { params: { weekStart } }).then(res => res.data),
};