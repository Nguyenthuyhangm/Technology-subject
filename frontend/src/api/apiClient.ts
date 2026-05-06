import axios, { AxiosError, type AxiosInstance } from 'axios';

// ==========================================================================
// apiClient
// --------------------------------------------------------------------------
// Client axios dùng chung cho toàn bộ frontend.
//
// Quy tắc baseURL (sau khi merge, để tránh phải cấu hình env từng máy):
//   - Nếu có `VITE_API_BASE_URL` trong .env        → dùng giá trị đó (đã trim,
//     đã bỏ dấu `/` cuối). Ví dụ: `http://localhost:8080`.
//   - Nếu KHÔNG set                                 → fallback về `/api`
//     → đi qua proxy của Vite (xem `vite.config.ts`) nên:
//       * không cần CORS backend,
//       * dev và prod cùng dùng 1 code, chỉ khác env.
//
// Tất cả request/response đều log ra console để dễ debug sau merge:
//   [api][req] GET /api/products/search { q: '...' }
//   [api][res] 200  /products/search
//   [api][err] GET  /api/products/search → 500 Request failed with status 500
// ==========================================================================

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

apiClient.interceptors.request.use((config) => {
  // Log để dễ trace call path sau khi merge (đặc biệt khi đổi từ
  // `http://localhost:8080/...` sang `/api/...` chạy qua proxy).
  console.log(
    '[api][req]',
    config.method?.toUpperCase(),
    `${config.baseURL ?? ''}${config.url ?? ''}`,
    config.params ?? '',
  );
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    console.log('[api][res]', res.status, res.config.url);
    return res;
  },
  (err: AxiosError) => {
    console.error(
      '[api][err]',
      err.config?.method?.toUpperCase(),
      err.config?.url,
      '→',
      err.response?.status ?? 'NETWORK',
      err.message,
    );
    return Promise.reject(err);
  },
);

export default apiClient;
