import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_PROXY_TARGET = 'http://localhost:8000';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const backendBaseUrl = env.VITE_BACKEND_BASE_URL?.trim();
  const proxyTarget = env.VITE_BACKEND_PROXY_TARGET?.trim() || DEFAULT_PROXY_TARGET;

  const shouldProxyApi = !backendBaseUrl;

  return {
    plugins: [react()],
    server: shouldProxyApi
      ? {
          proxy: {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : {},
  };
});
