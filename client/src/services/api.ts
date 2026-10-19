import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { User } from '../types/api';

const baseURL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api/v1';
export const apiClient = axios.create({ baseURL, withCredentials: true, headers: { 'Content-Type': 'application/json' } });
let refreshInFlight: Promise<unknown> | null = null;
let csrfTokenInMemory: string | null = null;
let authGeneration = 0;

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean; _csrfRetry?: boolean };
type ApiErrorResponse = { error?: { code?: string } };
function readCookie(name: string): string | undefined {
  return document.cookie.split('; ').find((value) => value.startsWith(`${name}=`))?.split('=').slice(1).join('=');
}

function refreshSession(): Promise<unknown> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = () => apiClient.post('/auth/refresh');
  const request = typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('quizsphere-auth-refresh', refresh)
    : refresh();
  refreshInFlight = request.finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

apiClient.interceptors.request.use((config) => {
  const csrfToken = csrfTokenInMemory ?? readCookie('qs_csrf');
  if (csrfToken && !['get', 'head', 'options'].includes((config.method ?? 'get').toLowerCase())) config.headers.set('X-CSRF-Token', decodeURIComponent(csrfToken));
  return config;
});

apiClient.interceptors.response.use((response) => response, async (error: AxiosError) => {
  const config = error.config as RetryConfig | undefined;
  const url = config?.url ?? '';
  if (
    error.response?.status === 403
    && (error.response.data as ApiErrorResponse | undefined)?.error?.code === 'CSRF_FAILED'
    && config
    && !config._csrfRetry
  ) {
    config._csrfRetry = true;
    try {
      const response = await apiClient.get<ApiEnvelope<{ csrfToken: string }>>('/auth/csrf');
      csrfTokenInMemory = response.data.data.csrfToken;
      return apiClient(config);
    } catch (csrfError) {
      return Promise.reject(csrfError);
    }
  }
  if (error.response?.status === 401 && config && !config._retry && !url.includes('/auth/login') && !url.includes('/auth/register') && !url.includes('/auth/refresh') && !url.includes('/auth/logout')) {
    config._retry = true;
    const generationAtRefreshStart = authGeneration;
    try {
      await refreshSession();
      return apiClient(config);
    } catch (refreshError) {
      if (authGeneration === generationAtRefreshStart && axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
        window.dispatchEvent(new CustomEvent('quizsphere:session-expired'));
      }
      return Promise.reject(refreshError);
    }
  }
  return Promise.reject(error);
});

if (typeof window !== 'undefined') {
  window.addEventListener('quizsphere:session-expired', () => { csrfTokenInMemory = null; });
}

export type ApiEnvelope<T> = { success: true; data: T };
export async function getData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get<ApiEnvelope<T>>(url, { params });
  return data.data;
}
export async function postData<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const { data } = await apiClient.post<ApiEnvelope<T>>(url, body ?? {}, { headers });
  return data.data;
}
export async function putData<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const { data } = await apiClient.put<ApiEnvelope<T>>(url, body ?? {}, { headers });
  return data.data;
}
export async function patchData<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch<ApiEnvelope<T>>(url, body ?? {});
  return data.data;
}
export async function deleteData<T>(url: string): Promise<T> {
  const { data } = await apiClient.delete<ApiEnvelope<T>>(url);
  return data.data;
}
export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.error?.message ?? 'Unable to connect. Please try again.';
  return error instanceof Error ? error.message : 'Something went wrong.';
}
export function apiErrorDetails(error: unknown): unknown {
  return axios.isAxiosError(error) ? error.response?.data?.error?.details : undefined;
}
export function apiErrorCode(error: unknown): string | undefined {
  return axios.isAxiosError(error) ? error.response?.data?.error?.code : undefined;
}
export function apiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export const authApi = {
  me: () => getData<{ user: User }>('/auth/me').then((value) => value.user),
  login: async (payload: { email: string; password: string }) => {
    const result = await postData<{ user: User }>('/auth/login', payload);
    authGeneration += 1;
    return result.user;
  },
  register: async (payload: { email: string; username: string; displayName: string; password: string }) => {
    const result = await postData<{ user: User; signupBonus: number }>('/auth/register', payload);
    authGeneration += 1;
    return result;
  },
  logout: () => postData<{ loggedOut: boolean }>('/auth/logout'),
};
