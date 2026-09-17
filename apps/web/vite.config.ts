import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mojolog/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-maplibre': ['maplibre-gl'],
          'vendor-react': ['react', 'react-dom'],
          'vendor-crypto': ['@scure/bip39'],
        },
      },
    },
  },
});
