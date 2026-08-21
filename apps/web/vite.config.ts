import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '../../'), ['VITE_', 'PASSWORD', 'PASSCODE']);
  const webEnv = loadEnv(mode, __dirname, ['VITE_', 'PASSWORD', 'PASSCODE']);
  const mergedEnv = { ...rootEnv, ...webEnv, ...process.env };
  const rawPassword = (mergedEnv.PASSWORD || mergedEnv.PASSCODE || mergedEnv.VITE_PASSWORD || '').trim();

  return {
    plugins: [react()],
    envDir: path.resolve(__dirname, '../../'),
    envPrefix: ['VITE_', 'PASSWORD', 'PASSCODE'],
    define: {
      'import.meta.env.PASSWORD': JSON.stringify(rawPassword),
      'import.meta.env.PASSCODE': JSON.stringify(rawPassword),
    },
    resolve: {
      alias: {
        '@roammate/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
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
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-maplibre': ['maplibre-gl'],
            'vendor-react': ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
