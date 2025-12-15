import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Needed for Docker container port mapping
    port: 5173,
    proxy: {
      '/api': {
        // Target the backend service name defined in docker-compose.yml
        target: 'http://backend:8000',
        changeOrigin: true,
        // Optional: Remove /api prefix when forwarding to backend
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    }
  }
});