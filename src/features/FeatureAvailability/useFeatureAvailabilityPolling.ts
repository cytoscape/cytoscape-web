import { useEffect, useState } from 'react'

import {
  FeatureAvailabilityState,
  initialState,
} from './FeatureAvailabilityContext'

/**
 * Cytoscape Desktop version endpoint URL.
 * This endpoint is polled to check if Cytoscape Desktop is running locally.
 */
const CYTOSCAPE_ENDPOINT = 'http://127.0.0.1:1234/v1/version'

/**
 * Polling interval in milliseconds.
 * The hook checks Cytoscape Desktop availability every 5 seconds.
 */
const POLLING_INTERVAL_MS = 5000

/**
 * Hook that manages feature availability state and polling logic.
 *
 * This hook:
 * - Detects Safari browser (which doesn't support the feature)
 * - Polls Cytoscape Desktop endpoint to check availability
 * - Manages state updates via useState
 *
 * @returns The current feature availability state
 */
export const useFeatureAvailabilityPolling = (): FeatureAvailabilityState => {
  const [state, setState] = useState<FeatureAvailabilityState>(initialState)

  /**
   * Polls the Cytoscape Desktop endpoint to check availability.
   * Updates state based on the response or handles errors gracefully.
   */
  const pollCytoscapeDesktopAvailability = async (
    abortController: AbortController,
  ): Promise<void> => {
    try {
      const response = await fetch(CYTOSCAPE_ENDPOINT, {
        signal: abortController.signal,
      })
      if (response.ok) {
        setState((prev) => ({ ...prev, isCyDeskAvailable: true }))
      } else {
        setState((prev) => ({ ...prev, isCyDeskAvailable: false }))
      }
    } catch (error) {
      // Ignore AbortError (happens during cleanup)
      // For other errors, mark Cytoscape Desktop as unavailable
      if (error instanceof Error && error.name !== 'AbortError') {
        setState((prev) => ({ ...prev, isCyDeskAvailable: false }))
      } else if (!(error instanceof Error)) {
        // Handle non-Error objects (shouldn't happen with fetch, but be safe)
        setState((prev) => ({ ...prev, isCyDeskAvailable: false }))
      }
    }
  }

  useEffect(() => {
    // Detect Safari browser (which doesn't support this feature)
    const userAgent = navigator.userAgent.toLowerCase()
    const isSafari =
      userAgent.includes('safari') && !userAgent.includes('chrome')

    setState((prev) => ({ ...prev, isSafari }))

    // Skip polling if Safari (feature not supported)
    if (isSafari) {
      return
    }

    // Start polling for Cytoscape Desktop availability
    const abortController = new AbortController()
    const intervalId = setInterval(() => {
      void pollCytoscapeDesktopAvailability(abortController)
    }, POLLING_INTERVAL_MS)

    // Cleanup: stop polling and abort any in-flight requests
    return () => {
      clearInterval(intervalId)
      abortController.abort()
    }
  }, [])

  return state
}
