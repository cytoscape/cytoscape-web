import { useSyncExternalStore } from 'react'

/**
 * Whether the browser currently reports a network connection.
 *
 * Deliberately separate from local persistence: Cytoscape Web keeps the
 * workspace in this browser, so editing and autosave continue while offline.
 * Only NDEx and other remote services are affected, and they are the only
 * things that should be gated on this.
 *
 * `navigator.onLine` is a lower bound, not a guarantee: it reports whether the
 * machine has a link, not whether NDEx is reachable. Treat `false` as certainly
 * offline and `true` as "worth trying".
 */

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

const getSnapshot = (): boolean => window.navigator.onLine

// SSR / prerender has no navigator; assume online so nothing renders as
// unavailable in a context that cannot know.
const getServerSnapshot = (): boolean => true

export const useOnlineStatus = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
