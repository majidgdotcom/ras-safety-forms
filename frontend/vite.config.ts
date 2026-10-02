import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ras/shared': path.resolve(__dirname, '../packages/shared/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split big libraries so the app code loads (and caches) separately
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          aws: ['aws-amplify'],
          charts: ['recharts'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
