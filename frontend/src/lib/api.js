import { auth } from './firebase';

const BASE = import.meta.env.VITE_API_URL || '';

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function request(method, path, body) {
  const token = await getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};

// Convenience methods per resource
export const receiptsApi = {
  list: () => api.get('/receipts'),
  create: (data) => api.post('/receipts', data),
  update: (id, data) => api.patch(`/receipts/${id}`, data),
  remove: (id) => api.delete(`/receipts/${id}`),
};
export const customersApi = {
  list: () => api.get('/customers'),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.patch(`/customers/${id}`, data),
  remove: (id) => api.delete(`/customers/${id}`),
};
export const stockApi = {
  entries: () => api.get('/stock/entries'),
  addEntry: (data) => api.post('/stock/entries', data),
  transfers: () => api.get('/stock/transfers'),
  addTransfer: (data) => api.post('/stock/transfers', data),
  deleteTransfer: (id) => api.delete(`/stock/transfers/${id}`),
  models: () => api.get('/stock/models'),
  deleteModel: (name) => api.delete(`/stock/models/${encodeURIComponent(name)}`),
};
export const expensesApi = {
  list: () => api.get('/expenses'),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.patch(`/expenses/${id}`, data),
  remove: (id) => api.delete(`/expenses/${id}`),
};
export const depositsApi = {
  list: () => api.get('/deposits'),
  create: (data) => api.post('/deposits', data),
  update: (id, data) => api.patch(`/deposits/${id}`, data),
  remove: (id) => api.delete(`/deposits/${id}`),
};
export const bookingsApi = {
  list: () => api.get('/bookings'),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.patch(`/bookings/${id}`, data),
  remove: (id) => api.delete(`/bookings/${id}`),
};
export const feedbackApi = {
  list: () => api.get('/feedback'),
  update: (id, data) => api.patch(`/feedback/${id}`, data),
};
export const employeesApi = {
  list: () => api.get('/employees'),
  update: (id, data) => api.patch(`/employees/${id}`, data),
  createUser: (data) => api.post('/auth/create-user', data),
  deleteUser: (uid) => api.delete(`/auth/delete-user/${uid}`),
  setRole: (data) => api.post('/auth/set-role', data),
};
export const attendanceApi = {
  list: () => api.get('/attendance'),
  mark: (data) => api.post('/attendance', data),
};
export const dashboardApi = {
  stats: () => api.get('/dashboard'),
};
