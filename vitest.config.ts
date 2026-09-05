// a pretty standard config

import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig(async () => {
  const resolvedViteConfig = await (typeof viteConfig === 'function'
    ? viteConfig({ command: 'serve', mode: 'test' })
    : viteConfig)

  return mergeConfig(resolvedViteConfig, {
    test: {
      // jsdom is the safe default; DOM-free test files opt into the much
      // cheaper node environment with a `// @vitest-environment node` first
      // line (jsdom setup costs ~1s per file, node is near-free).
      environment: 'jsdom',
      // Worker threads spawn faster than the default child-process forks.
      pool: 'threads',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      setupFiles: ['./vitest-setup.ts'],
      coverage: {
        // Measure app source only; generated types, tests, and test
        // fixtures would otherwise dilute the numbers.
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.{test,spec}.{ts,tsx}',
          'src/**/*.d.ts',
          'src/**/__mocks__/**',
          'src/**/__testUtils__/**',
        ],
        // text-summary for the terminal, html for local browsing
        // (coverage/index.html), lcov for CI tooling.
        reporter: ['text-summary', 'html', 'lcov'],
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
  })
})
