import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL + '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(
  function(config) {
    var token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    return config;
  },
  function(error) {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  function(res) { return res; },
  function(err) {
    console.error('API Error:', err.response);
    return Promise.reject(new Error(
      (err.response && err.response.data && err.response.data.message)
        ? err.response.data.message
        : 'Something went wrong'
    ));
  }
);

export var getOrders   = function(params)   { return api.get('/orders', { params: params }); };
export var createOrder = function(data)     { return api.post('/orders', data); };
export var updateOrder = function(id, data) { return api.put('/orders/' + id, data); };
export var deleteOrder = function(id)       { return api.delete('/orders/' + id); };

export var getDashboard  = function()     { return api.get('/dashboard'); };
export var saveDashboard = function(data) { return api.post('/dashboard', data); };

export var getAnalytics = function(range) { return api.get('/analytics', { params: { range: range } }); };

export default api;