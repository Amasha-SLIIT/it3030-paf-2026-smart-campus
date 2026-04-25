

import api from './axiosInstance';

const BASE = '/tickets';

// ── Ticket CRUD ──────────────────────────────────────────────────────────────

export const createTicket = (ticketData, images = []) => {
  const form = new FormData();
  
  form.append(
    'ticket',
    new Blob([JSON.stringify(ticketData)], { type: 'application/json' })
  );
  images.forEach(img => {
    if (img) form.append('images', img);
  });

  return api.post(BASE, form);
};

export const getTickets = (params = {}) => api.get(BASE, { params });


export const getTicketById = (id) =>
  api.get(`${BASE}/${id}`).then(res => res.data);

export const updateTicket = (id, ticketData, images = []) => {
  const form = new FormData();
  form.append(
    'ticket',
    new Blob([JSON.stringify(ticketData)], { type: 'application/json' })
  );
  images.forEach(img => { if (img) form.append('images', img); });
  return api.put(`${BASE}/${id}`, form);
};

export const deleteTicket = (id) => api.delete(`${BASE}/${id}`);

// ── Admin Actions ────────────────────────────────────────────────────────────

export const assignTicket = (id, staffUserId) =>
  api.patch(`${BASE}/${id}/assign`, { staffUserId }).then(res => res.data);


export const updateTicketStatus = (id, payload) =>
  api.patch(`${BASE}/${id}/status`, payload).then(res => res.data);


export const respondToAssignment = (id, accept, reason = '') =>
  api.patch(`${BASE}/${id}/respond-assignment`, { accept, reason }).then(res => res.data);

export const updatePriority = (id, currentPriority) =>
  api.patch(`${BASE}/${id}/status`, {
    status: 'IN_PROGRESS',
    currentPriority,
  }).then(res => res.data);

// ── Comments ─────────────────────────────────────────────────────────────────


export const getComments = (ticketId) =>
  api.get(`${BASE}/${ticketId}/comments`).then(res => res.data);

export const addComment = (ticketId, message) =>
  api.post(`${BASE}/${ticketId}/comments`, { message }).then(res => res.data);

export const editComment = (ticketId, commentId, message) =>
  api.put(`${BASE}/${ticketId}/comments/${commentId}`, { message }).then(res => res.data);

export const deleteComment = (ticketId, commentId) =>
  api.delete(`${BASE}/${ticketId}/comments/${commentId}`);

// ── Resources (for dropdowns) ────────────────────────────────────────────────

export const getActiveResources = () =>
  api.get('/resources', { params: { status: 'ACTIVE' } });