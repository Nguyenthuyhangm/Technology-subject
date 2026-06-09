import axios, { type AxiosInstance } from 'axios';
import type { AxiosError } from "axios";
import { supabase } from '../lib/supabase';
import { monitor } from '../util/monitoring';


// BIẾN GLOBAL ĐỂ CACHE TOKEN
let cachedToken: string | null = null;

// 1. Lấy token ngay khi khởi tạo ứng dụng
supabase.auth.getSession().then(({ data: { session } }) => {
    cachedToken = session?.access_token ?? null;
});

// 2. Tự động cập nhật token khi trạng thái Auth thay đổi (Login/Logout/Refresh)
supabase.auth.onAuthStateChange((_event, session) => {
    cachedToken = session?.access_token ?? null;
});

function resolveBaseUrl(): string {
    const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
    const trimmed = raw != null ? String(raw).trim().replace(/\/$/, '') : '';
    return trimmed.length > 0 ? trimmed : '/api';
}

export const API_BASE_URL = resolveBaseUrl();

export const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15_000,
    headers: { 
        Accept: 'application/json',
        'Content-Type': 'application/json'
    },
});

/**
 * INTERCEPTOR ĐÃ TỐI ƯU
 * Không dùng async/await để tránh làm chậm Request gửi đi (TTFB)
 */
apiClient.interceptors.request.use((config) => {
    // Gắn token từ biến đã cache sẵn
    if (cachedToken) {
        config.headers.Authorization = `Bearer ${cachedToken}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
apiClient.interceptors.response.use(
  (response) => {
    monitor.recordApiRequest(false);
    return response;
  },
  (error: AxiosError) => {
    const url = error.config?.url ?? '';
    if (!url.includes('/metrics/frontend')) {
      monitor.recordApiRequest(true);
    }
    return Promise.reject(error);
  }
);

export default apiClient;