import { useSyncExternalStore } from 'react'

import {
  getBootState,
  subscribeBootState,
  type BootStateSnapshot,
} from '../bootState'

/**
 * Subscribes a component to the live boot message / error.
 *
 * getBootState returns a stable object identity when nothing changed, which
 * useSyncExternalStore requires — a fresh object per call would re-render
 * forever.
 */
export const useBootState = (): BootStateSnapshot =>
  useSyncExternalStore(subscribeBootState, getBootState, getBootState)
