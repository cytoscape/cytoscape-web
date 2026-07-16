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
      setupFiles: ['./vitest-setup.ts']
    },
  });
});
