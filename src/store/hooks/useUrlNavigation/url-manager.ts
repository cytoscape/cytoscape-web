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
}> = []
let currentHistoryIndex = -1

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

  // 4. Force replace for navigation to the same network ID
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

export const resetNavigationState = (): void => {
  lastUrlPath = ''
  lastNetworkId = ''
  lastNavigationTime = 0
  isHandlingNavigation = false
  isHistoryNavigation = false
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
