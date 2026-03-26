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
export const getCalendar = () => api.get('/dashboard/calendar');

export const getTasks = (month) => api.get('/tasks', { params: month ? { month } : {} });
export const generateTasks = () => api.post('/tasks/generate');
export const completeTask = (id) => api.post(`/tasks/${id}/complete`);
export const uncompleteTask = (id) => api.post(`/tasks/${id}/uncomplete`);
export const verifyTask = (id) => api.post(`/tasks/${id}/verify`);
export const getTaskScore = (month) => api.get('/tasks/score', { params: month ? { month } : {} });
export const getTaskFeedback = () => api.get('/tasks/feedback');

export const uploadForm16 = (file, autoSave = false) => {
  const form = new FormData();
  form.append('file', file);
  if (autoSave) form.append('auto_save', 'true');
  return api.post('/tax/upload-form16', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default api;
