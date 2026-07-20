// a pretty standard config

import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig(async () => {
  const resolvedViteConfig = await (typeof viteConfig === 'function'
    ? viteConfig({ command: 'serve', mode: 'test' })
    : viteConfig);

  return mergeConfig(resolvedViteConfig, {
    test: {
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      setupFiles: ['./vitest-setup.ts'],
      coverage: {
        // Coverage floor for the IndexedDB layer (REVIEW.md A8): enforced
        // whenever coverage is collected (npm run test:coverage). Floors
        // sit slightly below the measured 2026-07-20 levels (76% stmts /
        // 73% branches / 94% functions) so regressions fail loudly while
        // routine changes don't.
        thresholds: {
          'src/data/db/**/*.ts': {
            statements: 72,
            branches: 68,
            functions: 90,
            lines: 72,
          },
        },
      },
    },
  });
});
