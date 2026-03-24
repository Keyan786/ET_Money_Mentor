import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 300000,
});

const savedToken = localStorage.getItem('token');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

export const getMarketOverview = () => api.get('/market/overview');
export const getFundData = (code) => api.get(`/market/fund/${code}`);
export const generateFirePlan = (data) => api.post('/fire/plan', data);
export const calculateHealthScore = (data) => api.post('/health/score', data);
export const optimizeTax = (data) => api.post('/tax/optimize', data);

export const getProfile = () => api.get('/profile');
export const saveProfile = (data) => api.put('/profile', data);
export const getDashboard = () => api.get('/dashboard');

export default api;
