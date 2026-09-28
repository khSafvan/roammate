import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@mojolog/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
      '@mojolog/api-client': new URL('./src/index.ts', import.meta.url).pathname,
    },
  },
});
