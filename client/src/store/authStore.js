import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: !!user });
  },

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: !!token });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, token } = res.data.data;
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/register', data);
      const { user, token } = res.data.data;
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Registration failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me');
      const user = res.data.data.user;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
      return user;
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
      return null;
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.put('/auth/profile', data);
      const user = res.data.data.user;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isLoading: false });
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  }
}));

export default useAuthStore;
