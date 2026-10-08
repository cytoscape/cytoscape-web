import 'fake-indexeddb/auto'
import debug from 'debug'
import { enableMapSet } from 'immer'
import { expect, vi } from 'vitest'

// Enable Immer's MapSet plugin to support Map and Set in Immer
enableMapSet()

// The debug package's Node build writes straight to process.stderr, bypassing
// Vitest's console interception — so `src/debug.ts` loggers enabled during
// boot tests would still print in the `:quiet` scripts. Drop them entirely.
if (process.env.CYWEB_TEST_QUIET !== undefined) {
  debug.log = () => {}
}

// 1s is a deliberately tight default: a DOM-free unit test that takes longer
// is stuck, not slow. React render specs (`.tsx`) are the exception — mounting
// an MUI dialog tree for the first time, with 16 workers competing for the
// box, regularly crosses 1s and produced 13-16 spurious failures per full run.
// Give those files 5s; still tight enough to catch a hang.
const isReactSpec = (expect.getState().testPath ?? '').endsWith('.tsx')
vi.setConfig({ testTimeout: isReactSpec ? 5000 : 1000 })
