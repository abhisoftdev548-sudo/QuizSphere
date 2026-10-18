import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { User } from '../types/api';

const baseURL = '/api/v1';
export const apiClient = axios.create({ baseURL, withCredentials: true, headers: { 'Content-Type': 'application/json' } });
let refreshInFlight: Promise<unknown> | null = null;

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };
function readCookie(name: string): string | undefined {
  return document.cookie.split('; ').find((value) => value.startsWith(`${name}=`))?.split('=').slice(1).join('=');
}

apiClient.interceptors.request.use((config) => {
  const csrfToken = readCookie('qs_csrf');
  if (csrfToken && !['get', 'head', 'options'].includes((config.method ?? 'get').toLowerCase())) config.headers.set('X-CSRF-Token', decodeURIComponent(csrfToken));
  return config;
});

apiClient.interceptors.response.use((response) => response, async (error: AxiosError) => {
  const config = error.config as RetryConfig | undefined;
  const url = config?.url ?? '';
  if (error.response?.status === 401 && config && !config._retry && !url.includes('/auth/login') && !url.includes('/auth/register') && !url.includes('/auth/refresh') && !url.includes('/auth/logout')) {
    config._retry = true;
    try {
      refreshInFlight ??= apiClient.post('/auth/refresh').finally(() => { refreshInFlight = null; });
      await refreshInFlight;
      return apiClient(config);
    } catch (refreshError) {
      window.dispatchEvent(new CustomEvent('quizsphere:session-expired'));
      return Promise.reject(refreshError);
    }
  }
  return Promise.reject(error);
});

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

export const authApi = {
  me: () => getData<{ user: User }>('/auth/me').then((value) => value.user),
  login: (payload: { email: string; password: string }) => postData<{ user: User }>('/auth/login', payload).then((value) => value.user),
  register: (payload: { email: string; username: string; displayName: string; password: string }) => postData<{ user: User; signupBonus: number }>('/auth/register', payload),
  logout: () => postData<{ loggedOut: boolean }>('/auth/logout'),
};
