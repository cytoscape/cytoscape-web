#!/usr/bin/env node
// Captures the in-app manual's screenshots from the running app.
//
//   node scripts/capture-manual-screenshots.mjs            # every recipe
//   node scripts/capture-manual-screenshots.mjs cell-view  # one or more ids
//
// Recipes: src/features/Manual/screenshots/recipes.ts. Output:
// public/manual-assets/generated/<id>.png. Builds the app and serves it on
// port 5502 unless MANUAL_SCREENSHOT_URL names a running server.
//
// Commit images captured on Linux (the "Manual Screenshots" workflow, or
// Playwright's Docker image): fonts render differently on macOS.

import { spawnSync } from 'node:child_process'

const ids = process.argv.slice(2)
const args = [
  'playwright',
  'test',
  '-c',
  'playwright.manual-screenshots.config.ts',
]
if (ids.length > 0) {
  // Test titles are the recipe ids. Anchored at the end, so `cell` does not
  // match `cell-view`.
  args.push('--grep', `(${ids.join('|')})$`)
}
if (process.platform !== 'linux' && !process.env.CI) {
  console.warn(
    'Note: capturing on a non-Linux machine. Use these images to check a recipe; commit images from the Manual Screenshots workflow.',
  )
}
const result = spawnSync('npx', args, { stdio: 'inherit' })
process.exit(result.status ?? 1)
