import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const TOKEN_KEY = 'cardioguard_token';

export function getStoredToken() {
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    if (token) localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
    return token;
}

export function storeToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
}

export function clearStoredToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && getStoredToken()) {
            clearStoredToken();
            window.dispatchEvent(new Event('cardioguard:session-expired'));
        }
        return Promise.reject(error);
    },
);

export const submitAssessment = async (healthData, persist = true) => {
    const response = await api.post('/predict', healthData, { params: { persist } });
    return response.data;
};

export const registerUser = async (userData) => (await api.post('/auth/register', userData)).data;
export const loginUser = async (credentials) => (await api.post('/auth/login', credentials)).data;
export const requestPasswordReset = async (email) => (await api.post('/auth/forgot-password', { email })).data;
export const resetPassword = async (data) => (await api.post('/auth/reset-password', data)).data;
export const getCurrentUser = async () => (await api.get('/auth/me')).data;
export const getHistory = async () => (await api.get('/history')).data;