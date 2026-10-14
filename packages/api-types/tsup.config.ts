import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: { only: true },
  outDir: 'dist',
  clean: true,
})
