import { NavigateOptions } from 'react-router-dom'
import { NavigationConfig } from './NavigationConfig'

let lastNetworkId: string = '' // Last displayed network ID
let lastUrlPath: string = '' // Last set URL path
let lastNavigationTime: number = 0 // Timestamp of last navigation
let isHandlingNavigation: boolean = false // Flag for navigation in progress
let isHistoryNavigation: boolean = false // Flag for navigation triggered by history action

// Counter added for debugging
let navigationCount: number = 0

// Variables added for history debugging
let historyEntries: Array<{
  url: string
  networkId: string
  timestamp: number
  browserHistoryLength: number // Track browser history length at time of entry
}> = []
let currentHistoryIndex = -1

/**
 * Get comprehensive history information
 */
export const getHistoryInfo = () => {
  return {
    browserHistoryLength: window.history.length,
    internalHistoryLength: historyEntries.length,
    currentInternalIndex: currentHistoryIndex,
    canGoBack: currentHistoryIndex > 0,
    canGoForward: currentHistoryIndex < historyEntries.length - 1,
    entries: historyEntries,
    currentEntry: historyEntries[currentHistoryIndex] || null,
    navigationCount,
    lastNetworkId,
    lastUrlPath,
  }
}

/**
 * Add history entry (internal use only)
 */
const addHistoryEntry = (url: string, networkId: string): void => {
  // Truncate history entries after current position
  if (currentHistoryIndex < historyEntries.length - 1) {
    historyEntries = historyEntries.slice(0, currentHistoryIndex + 1)
  }

  // Add new entry
  historyEntries.push({
    url,
    networkId,
    timestamp: Date.now(),
    browserHistoryLength: window.history.length,
  })

  currentHistoryIndex = historyEntries.length - 1

  // Output debug information
  console.log('[History Debug] Added entry:', getCurrentHistoryState())
}

/**
 * Simulate back button press (for debugging)
 */
const simulateBackButtonPress = (): void => {
  if (currentHistoryIndex > 0) {
    currentHistoryIndex--
    console.log(
      '[History Debug] Back button pressed:',
      getCurrentHistoryState(),
    )
  }
}

/**
 * Return current history state (for debugging)
 */
const getCurrentHistoryState = (): object => {
  return {
    currentIndex: currentHistoryIndex,
    totalEntries: historyEntries.length,
    currentEntry: historyEntries[currentHistoryIndex] || null,
    allEntries: historyEntries,
    canGoBack: currentHistoryIndex > 0,
    canGoForward: currentHistoryIndex < historyEntries.length - 1,
  }
}

// Modified navigateToNetwork to record history entries
export const navigateToNetwork = (
  config: NavigationConfig,
  navigate: (path: string, options?: NavigateOptions) => void,
): void => {
  const { workspaceId, networkId, searchParams, replace = false } = config
  navigationCount++

  // Convert to safe value
  const safeNetworkId: string = networkId ?? ''

  // Build current path
  let path: string = networkId
    ? `/${workspaceId}/networks/${networkId}`
    : `/${workspaceId}/networks`

  // Add search parameters
  const searchString = searchParams ? searchParams.toString() : ''
  if (searchString) {
    path += `?${searchString}`
  }

  // 1. Control frequent navigation calls (history operations are exceptions)
  const now = Date.now()
  if (now - lastNavigationTime < 300 && !isHistoryNavigation) {
    console.debug(
      `[URLManager:${navigationCount}] Navigation throttled - too frequent calls`,
    )
    return
  }

  // 2. Ignore if already handling navigation (history operations are exceptions)
  if (isHandlingNavigation && !isHistoryNavigation) {
    console.debug(
      `[URLManager:${navigationCount}] Already handling navigation, skipping`,
    )
    return
  }

  // 3. Ignore if path is exactly the same (history operations are exceptions)
  if (path === lastUrlPath && !isHistoryNavigation) {
    console.debug(
      `[URLManager:${navigationCount}] Skipping navigation to same path: ${path}`,
    )
    return
  }

  // 4. Check if network ID matches the one currently in the pathname to avoid duplicates
  if (safeNetworkId !== '' && !isHistoryNavigation) {
    const currentPathname = window.location.pathname
    const currentNetworkIdMatch = currentPathname.match(/\/networks\/([^/?]+)/)
    const currentNetworkId = currentNetworkIdMatch
      ? currentNetworkIdMatch[1]
      : null

    if (currentNetworkId === safeNetworkId) {
      console.debug(
        `[URLManager:${navigationCount}] Skipping navigation - network ID ${safeNetworkId} is already in current pathname: ${currentPathname}`,
      )
      return
    }
  }

  // 5. Force replace for navigation to the same network ID
  let shouldReplace = replace
  if (safeNetworkId !== '' && safeNetworkId === lastNetworkId) {
    console.debug(
      `[URLManager:${navigationCount}] Same network ID detected: ${safeNetworkId}, forcing replace=true`,
    )
    shouldReplace = true
  }

  // ====== Execute navigation ======

  console.log(
    `[URLManager:${navigationCount}] Navigating to: ${path}, replace: ${shouldReplace}, networkId: ${safeNetworkId}`,
  )
  console.log(
    `[URLManager:${navigationCount}] Previous state: lastNetworkId=${lastNetworkId}, lastPath=${lastUrlPath}`,
  )
  console.log(
    `[URLManager:${navigationCount}] Browser history length before navigation: ${window.history.length}`,
  )

  // Update navigation state
  isHandlingNavigation = true
  lastUrlPath = path
  lastNavigationTime = now

  // Only update if network ID is valid
  if (safeNetworkId !== '') {
    lastNetworkId = safeNetworkId
  }

  // Execute navigation
  try {
    navigate(path, { replace: shouldReplace })

    // Add history entry (overwrite if replace is true)
    if (shouldReplace && historyEntries.length > 0) {
      historyEntries[currentHistoryIndex] = {
        url: path,
        networkId: safeNetworkId,
        timestamp: Date.now(),
        browserHistoryLength: window.history.length,
      }
    } else {
      addHistoryEntry(path, safeNetworkId)
    }
  } catch (error) {
    console.error(`[URLManager:${navigationCount}] Navigation error:`, error)
  }

  // Reset history operation flag
  isHistoryNavigation = false

  // Reset navigation in progress flag
  setTimeout(() => {
    isHandlingNavigation = false
  }, 100)
}

/**
 * Notify browser history operation (back/forward buttons)
 */
export const handleHistoryNavigation = (): void => {
  console.log(
    `[URLManager:${navigationCount}] Browser history navigation detected`,
  )
  isHistoryNavigation = true

  // When back button is pressed
  simulateBackButtonPress()

  // Display history details
  console.group('Current Browser History State')
  console.log('Current URL:', window.location.href)
  console.log('History length:', window.history.length)
  console.log('Can go back:', window.history.length > 1)
  console.log('Tracked history entries:', getCurrentHistoryState())
  console.groupEnd()

  // Reset flag after sufficient time has passed
  setTimeout(() => {
    if (isHistoryNavigation) {
      console.log(
        `[URLManager:${navigationCount}] Resetting isHistoryNavigation flag`,
      )
      isHistoryNavigation = false
    }
  }, 1000)
}

/**
 * Update only search parameters
 */
export const updateSearchParams = (
  params: URLSearchParams,
  updates: Record<string, string | null>,
  setSearchParams: (
    params: URLSearchParams,
    options?: { replace?: boolean },
  ) => void,
  replace: boolean = true,
): void => {
  navigationCount++
  console.log(
    `[URLManager:${navigationCount}] Updating search params:`,
    updates,
    `replace: ${replace}`,
  )

  // Always replace if it's the same network
  const newParams = new URLSearchParams(params)

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null) {
      newParams.delete(key)
    } else {
      newParams.set(key, value)
    }
  })

  // Always use replace=true for search parameter changes within the same network
  setSearchParams(newParams, { replace: true })
}

export const isInternalNavigation = (): boolean => {
  return isHandlingNavigation
}

/**
 * Clear all internal history tracking
 */
export const clearInternalHistory = (): void => {
  historyEntries = []
  currentHistoryIndex = -1
  lastNetworkId = ''
  lastUrlPath = ''
  lastNavigationTime = 0
  navigationCount = 0
  isHandlingNavigation = false
  isHistoryNavigation = false

  console.log('[History Debug] Internal history cleared')
}

/**
 * Reset navigation to a clean state and optionally navigate to root
 */
export const resetNavigationState = (): void => {
  clearInternalHistory()

  console.log('[History Debug] Navigation state reset (without URL change)')
}

/**
 * Reset navigation to a clean state and navigate to root
 */
export const resetNavigationToRoot = (): void => {
  clearInternalHistory()

  // This replaces the current entry, doesn't add to history
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', '/')
  }

  console.log('[History Debug] Navigation state reset to root')
}

/**
 * Display state for debugging
 */
export const getDebugState = (): Record<string, any> => {
  return {
    lastNetworkId,
    lastUrlPath,
    lastNavigationTime,
    isHandlingNavigation,
    isHistoryNavigation,
    navigationCount,
  }
}

// Expose history display function for debugging
export const printHistoryDebug = (): void => {
  console.group('Current History Debug Information')
  console.table(historyEntries)
  console.log('Current history state:', getCurrentHistoryState())
  console.groupEnd()
}

/**
 * Clear browser history - WARNING: This has significant limitations
 * Modern browsers don't allow scripts to clear all history for security reasons.
 * This function can only manipulate the current session's history stack.
 */
export const clearBrowserHistory = (): boolean => {
  if (typeof window === 'undefined') {
    console.warn(
      '[History Debug] Cannot clear browser history - not in browser environment',
    )
    return false
  }

  try {
    // Method 1: Replace current history entry with root
    window.history.replaceState(null, '', '/')

    // Method 2: Clear forward history by pushing then going back
    // This is a workaround but has limitations
    const currentLength = window.history.length

    // Push a temp state and immediately go back to clear forward entries
    window.history.pushState({ temp: true }, '', '/?temp=1')
    window.history.back()

    // After a brief delay, replace with clean root state
    setTimeout(() => {
      window.history.replaceState(null, '', '/')
      console.log(
        `[History Debug] Attempted to clear browser history. Length was: ${currentLength}, now: ${window.history.length}`,
      )
    }, 10)

    return true
  } catch (error) {
    console.error('[History Debug] Error clearing browser history:', error)
    return false
  }
}

/**
 * Initialize history clearing on page load/reload
 * This should be called when the application starts up
 */
export const initHistoryClearing = (): void => {
  if (typeof window === 'undefined') return

  // Check if this is a page reload or fresh load
  const perfEntries = window.performance.getEntriesByType(
    'navigation',
  ) as PerformanceNavigationTiming[]
  const isReload = perfEntries.length > 0 && perfEntries[0].type === 'reload'
  const isPageLoad =
    document.readyState === 'loading' ||
    (perfEntries.length > 0 && perfEntries[0].type === 'navigate')

  if (isReload || isPageLoad) {
    console.log(
      '[History Debug] Page reload/load detected, preserving current URL',
    )

    // Clear browser history
    clearBrowserHistory()

    // Clear internal history tracking
    clearInternalHistory()

    // DON'T navigate to root - preserve the current URL
    // Only navigate to root if we're actually at an invalid/empty path
    setTimeout(() => {
      if (
        window.location.pathname === '' ||
        window.location.pathname === null
      ) {
        window.history.replaceState(null, '', '/')
      }
      // Otherwise, keep the current URL as-is
    }, 50)
  }

  // Listen for beforeunload to potentially clear history before leaving
  window.addEventListener('beforeunload', () => {
    // Note: This won't clear history but ensures clean internal state
    clearInternalHistory()
  })
}

// Expose global debugging functions to window for console access
if (typeof window !== 'undefined') {
  // @ts-expect-error - Adding custom properties to window for debugging
  window.debugHistory = {
    getInfo: getHistoryInfo,
    printDebug: printHistoryDebug,
    getEntries: () => historyEntries,
    getBrowserLength: () => window.history.length,
    getCurrentState: getCurrentHistoryState,
    clearInternal: clearInternalHistory,
    resetToRoot: resetNavigationToRoot,
    clearBrowser: clearBrowserHistory,
    initClearing: initHistoryClearing,
  }
}
