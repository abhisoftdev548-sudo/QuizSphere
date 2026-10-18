import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token from localStorage as fallback
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login if not already there
      const isAuthRoute = window.location.pathname.includes('/login') || window.location.pathname.includes('/register');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Don't auto redirect here, let components handle
      }
    }
    return Promise.reject(error);
  }
);

export default api;
