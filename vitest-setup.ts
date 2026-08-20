import 'fake-indexeddb/auto'
import debug from 'debug'
import { enableMapSet } from 'immer'
import { vi } from 'vitest'

// Enable Immer's MapSet plugin to support Map and Set in Immer
enableMapSet()

// The debug package's Node build writes straight to process.stderr, bypassing
// Vitest's console interception — so `src/debug.ts` loggers enabled during
// boot tests would still print in the `:quiet` scripts. Drop them entirely.
if (process.env.CYWEB_TEST_QUIET !== undefined) {
  debug.log = () => {}
}

vi.setConfig({ testTimeout: 1000 })
