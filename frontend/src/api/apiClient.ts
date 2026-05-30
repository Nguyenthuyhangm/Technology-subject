//cái AxiosError không dùng thfi phuong xoa di 
import axios, { type AxiosInstance } from 'axios';
import { supabase } from '../lib/supabaseClient';

function resolveBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const trimmed = raw != null ? String(raw).trim().replace(/\/$/, '') : '';
  return trimmed.length > 0 ? trimmed : '/api';
}

export const API_BASE_URL = resolveBaseUrl();

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

// Tự động gắn Supabase JWT vào mọi request
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export default apiClient;