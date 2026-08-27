import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@roammate/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
      '@roammate/api-client': new URL('../../packages/api-client/src/index.ts', import.meta.url).pathname,
      '@roammate/sync': new URL('./src/index.ts', import.meta.url).pathname,
    },
  },
});
