const BASE_URL = 'http://localhost:8080/api/v1/resources';

const handleResponse = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
};

export const resourceApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    return fetch(`${BASE_URL}${query ? `?${query}` : ''}`).then(handleResponse);
  },

  getById: (id) => fetch(`${BASE_URL}/${id}`).then(handleResponse),

  getByQrCode: (qrCode) => fetch(`${BASE_URL}/qr/${qrCode}`).then(handleResponse),

  create: (data) =>
    fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  update: (id, data) =>
    fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  updateStatus: (id, status) =>
    fetch(`${BASE_URL}/${id}/status?status=${status}`, { method: 'PATCH' }).then(handleResponse),

  delete: (id) =>
    fetch(`${BASE_URL}/${id}`, { method: 'DELETE' }).then(handleResponse),

  uploadImage: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE_URL}/${id}/image`, { method: 'POST', body: form }).then(handleResponse);
  },

  getMaintenanceDue: () => fetch(`${BASE_URL}/maintenance/due`).then(handleResponse),

  markMaintenanceDone: (id) =>
    fetch(`${BASE_URL}/${id}/maintenance/done`, { method: 'POST' }).then(handleResponse),

  getAvailability: (id, weekStart) =>
    fetch(`${BASE_URL}/${id}/availability${weekStart ? `?weekStart=${weekStart}` : ''}`).then(handleResponse),
};
