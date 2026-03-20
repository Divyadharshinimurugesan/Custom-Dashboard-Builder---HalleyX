import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.response.use(
  res => res,
  err => Promise.reject(new Error(err.response?.data?.message || 'Something went wrong'))
);

// Orders
export const getOrders   = (params)   => api.get('/orders', { params });
export const createOrder = (data)     => api.post('/orders', data);
export const updateOrder = (id, data) => api.put(`/orders/${id}`, data);
export const deleteOrder = (id)       => api.delete(`/orders/${id}`);

// Dashboard
export const getDashboard  = ()     => api.get('/dashboard');
export const saveDashboard = (data) => api.post('/dashboard', data);

// Analytics
export const getAnalytics = (range) => api.get('/analytics', { params: { range } });

export default api;