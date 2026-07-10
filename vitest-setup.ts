import 'fake-indexeddb/auto'
import { enableMapSet } from 'immer'
import { vi } from 'vitest'

// Enable Immer's MapSet plugin to support Map and Set in Immer
enableMapSet()

vi.setConfig({ testTimeout: 1000 })
