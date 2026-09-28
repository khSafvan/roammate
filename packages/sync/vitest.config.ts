import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@mojolog/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
      '@mojolog/api-client': new URL('../../packages/api-client/src/index.ts', import.meta.url).pathname,
      '@mojolog/sync': new URL('./src/index.ts', import.meta.url).pathname,
    },
  },
});
