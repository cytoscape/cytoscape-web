import { useCallback, useState } from 'react'
import { useHref } from 'react-router-dom'

import {
  clearLocalCache,
  type ClearLocalCacheResult,
} from '@/data/db/clearLocalCache'

/**
 * Run Clear Local Cache and reload on success.
 *
 * Shared by Help › Developer › Clear Local Cache and the Error page's "Clear
 * Cache and Reload Cytoscape" button. The boot-failure shell calls
 * `clearLocalCache` directly, since it paints before React mounts.
 *
 * The reload is a full page load at the base URL, never a router navigation:
 * every store still holds the old workspace in memory.
 *
 * Presentation stays with the caller. Only `failed` returns to it, carrying the
 * reason to show; `cleared` is already reloading.
 */
export const useClearLocalCache = (): {
  clear: () => Promise<ClearLocalCacheResult>
  isClearing: boolean
  /** Full page load at the base URL, for a caller that cannot carry on. */
  reload: () => void
} => {
  // Respects a base path (`/cytoscape/`), which a bare '/' would discard.
  const rootHref = useHref('/')
  const [isClearing, setIsClearing] = useState(false)

  const reload = useCallback((): void => {
    window.location.assign(rootHref)
  }, [rootHref])

  const clear = useCallback(async (): Promise<ClearLocalCacheResult> => {
    setIsClearing(true)
    const result = await clearLocalCache()
    if (result.status === 'cleared') {
      reload()
    } else {
      setIsClearing(false)
    }
    return result
  }, [reload])

  return { clear, isClearing, reload }
}
