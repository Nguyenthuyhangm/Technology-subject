import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { IncomingMessage } from 'node:http';

// ==========================================================================
// Vite config — hardened sau khi merge
// --------------------------------------------------------------------------
// Mục tiêu:
//   1. Proxy `/api` → Spring Boot :8080 (endpoint mới, ví dụ
//      `/api/trending-deals`, `/api/products/search`, `/api/compare/:id`, …).
//   2. Proxy `/products` → Spring Boot :8080 để giữ tương thích với FE legacy
//      (một số service/page cũ vẫn gọi thẳng `/products/search`).
//   3. `watch.usePolling` = true → fix bug đặc thù Windows / OneDrive / WSL /
//      network drive không bắn được fs event, khiến HMR "đứng im".
//   4. Log mỗi request proxy (`[vite-proxy][...]`) để dễ debug 500 / CORS.
// ==========================================================================

// Trả về callback `configure` của http-proxy để in log mỗi lần proxy.
// Dùng đúng signature `NonNullable<ProxyOptions['configure']>` để TS không
// complain khi truyền vào `server.proxy[...].configure`.
function attachProxyLogger(prefix: string): NonNullable<ProxyOptions['configure']> {
  return (proxy) => {
    proxy.on('error', (err) => {
      console.error(`[vite-proxy][${prefix}] error:`, err?.message ?? err);
    });
    proxy.on('proxyReq', (_proxyReq, req: IncomingMessage) => {
      console.log(`[vite-proxy][${prefix}] →`, req.method, req.url);
    });
    proxy.on('proxyRes', (proxyRes, req: IncomingMessage) => {
      const status = proxyRes.statusCode ?? '-';
      console.log(`[vite-proxy][${prefix}] ←`, status, req.method, req.url);
    });
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
    strictPort: false,
    host: true, // cho phép truy cập từ máy khác trong LAN / Docker
    watch: {
      // Fix HMR không hoạt động trên Windows / OneDrive / WSL.
      usePolling: true,
      interval: 300,
    },
    proxy: {
      // --- Endpoint mới `/api/**` -------------------------------------------
      // Ví dụ: /api/trending-deals, /api/products/search, /api/compare/:id,
      //        /api/v1/price-history/:id, /api/wishlist, …
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: attachProxyLogger('/api'),
        // Chỉ phòng hờ response 500 từ backend vẫn trả body rõ ràng,
        // không cần rewrite path (backend đã có `/api/**`).
      },

      // --- Endpoint legacy `/products/**` -----------------------------------
      // `ProductController` hiện đã mount cả `/products` + `/api/products`,
      // nhưng FE cũ vẫn có chỗ gọi `fetch('http://localhost:8080/products/…')`.
      // Giữ proxy này để migration dần không vỡ.
      '/products': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: attachProxyLogger('/products'),
      },
    },
  },

  build: {
    sourcemap: true,
  },
});
