import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL}/api`,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.response.use(
  res => res,
  err => Promise.reject(new Error(err.response?.data?.message || 'Something went wrong'))
);

// Orders
export const getOrders   = (parimport axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL}/api`,
  headers: { 'Content-Type': 'application/json' }
});

// ✅ Attach JWT token to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Better error handling — log the real error for debugging
api.interceptors.response.use(
  res => res,
  err => {
    console.error('API Error:', err.response?.status, err.response?.data);
    return Promise.reject(new Error(err.response?.data?.message || 'Something went wrong'));
  }
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

export default api;ams)   => api.get('/orders', { params });
export const createOrder = (data)     => api.post('/orders', data);
export const updateOrder = (id, data) => api.put(`/orders/${id}`, data);
export const deleteOrder = (id)       => api.delete(`/orders/${id}`);

// Dashboard
export const getDashboard  = ()     => api.get('/dashboard');
export const saveDashboard = (data) => api.post('/dashboard', data);

// Analytics
export const getAnalytics = (range) => api.get('/analytics', { params: { range } });

export default api;