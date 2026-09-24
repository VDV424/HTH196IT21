import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libs into separate cacheable chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-lucide': ['lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,
  }
});
