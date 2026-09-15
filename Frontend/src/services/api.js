import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('cardioguard_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const submitAssessment = async (healthData, persist = true) => {
    const response = await api.post('/predict', healthData, { params: { persist } });
    return response.data;
};

export const registerUser = async (userData) => (await api.post('/auth/register', userData)).data;
export const loginUser = async (credentials) => (await api.post('/auth/login', credentials)).data;
export const getCurrentUser = async () => (await api.get('/auth/me')).data;
export const getHistory = async () => (await api.get('/history')).data;