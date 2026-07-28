import type { BootShellError } from './shell/bootShellMarkup'
import { DEFAULT_BOOT_MESSAGE } from './shell/bootShellMarkup'

// The one piece of state the boot shell renders from.
//
// Deliberately not Zustand: this is imported by the pre-React shell chunk, and
// pulling zustand + immer in there would put them on the first-paint critical
// path and undo the whole point of that chunk being tiny. It follows the same
// module-scope observable shape as src/debug.ts, so React consumes it through
// useSyncExternalStore.

export interface BootStateSnapshot {
  message: string
  /** Set once the boot has terminally failed; the shell switches to error mode. */
  error?: BootShellError
}

let snapshot: BootStateSnapshot = { message: DEFAULT_BOOT_MESSAGE }
const listeners = new Set<() => void>()

const emit = (next: BootStateSnapshot): void => {
  snapshot = next
  for (const listener of listeners) {
    listener()
  }
}

export const getBootState = (): BootStateSnapshot => snapshot

export const subscribeBootState = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const setBootMessage = (message: string): void => {
  // Identity-stable when nothing changed: getBootState is a
  // useSyncExternalStore snapshot, so returning a new object for a no-op
  // update would loop React.
  if (snapshot.message === message || snapshot.error !== undefined) {
    return
  }
  emit({ ...snapshot, message })
}

/** Terminal. Later message updates are ignored so the error is not overwritten. */
export const setBootError = (error: BootShellError): void => {
  emit({ ...snapshot, error })
}

export const resetBootStateForTesting = (): void => {
  emit({ message: DEFAULT_BOOT_MESSAGE })
  listeners.clear()
}
