import { fileURLToPath } from 'node:url';

import { configDefaults, defineConfig } from 'vitest/config';

import { handlebarsPlugin } from './rollup.config';

export default defineConfig({
  plugins: [handlebarsPlugin()],
  test: {
    coverage: {
      exclude: ['bin', 'dist', 'src/**/*.d.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
    },
    exclude: [...configDefaults.exclude, 'test/e2e/**/*.spec.ts'],
    root: fileURLToPath(new URL('./', import.meta.url)),
  },
});
