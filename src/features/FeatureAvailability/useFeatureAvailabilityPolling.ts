import { useEffect, useState, useCallback, useRef } from 'react'

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
 * - Provides manual polling control (no auto-polling on startup)
 * - Manages state updates via useState
 *
 * @returns The current feature availability state and control methods
 */
export type PollingStartResult = {
  canAccessEndpoint: boolean
  error?: string
}

export const useFeatureAvailabilityPolling = (): FeatureAvailabilityState & {
  startPolling: () => Promise<PollingStartResult>
  stopPolling: () => void
  checkPermission: () => Promise<PermissionState | null>
} => {
  const [state, setState] = useState<FeatureAvailabilityState>(initialState)
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Detect Safari browser once on mount
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isSafari =
      userAgent.includes('safari') && !userAgent.includes('chrome')
    setState((prev) => ({ ...prev, isSafari }))
  }, [])

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

  /**
   * Check the current permission state for local network access.
   * @returns The permission state ('prompt', 'granted', 'denied') or null if not supported
   */
  const checkPermission = useCallback(async (): Promise<PermissionState | null> => {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({
          name: 'local-network-access' as PermissionName,
        })
        return result.state
      }
    } catch (error) {
      // Permission API might not be available or supported
    }
    return null
  }, [])

  /**
   * Start polling for Cytoscape Desktop availability.
   * This will trigger the Local Network Access permission prompt if not already granted.
   * 
   * IMPORTANT: This must be called directly in response to a user gesture (button click)
   * for Chrome to show the permission prompt.
   * 
   * @returns A result indicating whether we can access the endpoint (permissions are fine).
   * If we get ERR_CONNECTION_REFUSED, it means we can access localhost but Cytoscape isn't running.
   * This is considered "canAccessEndpoint: true" because permissions are working.
   */
  const startPolling = useCallback(async (): Promise<PollingStartResult> => {
    // Check current Safari state (don't rely on closure)
    const userAgent = navigator.userAgent.toLowerCase()
    const isSafari =
      userAgent.includes('safari') && !userAgent.includes('chrome')

    // Skip if Safari (feature not supported)
    if (isSafari) {
      return { canAccessEndpoint: false, error: 'Safari not supported' }
    }

    // Stop any existing polling
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Make initial request to check if we can access the endpoint
    // This fetch() call must happen directly in response to user gesture
    // Chrome will show the permission prompt automatically when this fetch is made
    // IF the permission state is 'prompt' (not yet decided)
    try {
      const response = await fetch(CYTOSCAPE_ENDPOINT)
      if (response.ok) {
        setState((prev) => ({ ...prev, isCyDeskAvailable: true }))
      } else {
        setState((prev) => ({ ...prev, isCyDeskAvailable: false }))
      }
      // If we got a response (even if not ok), we can access the endpoint
      return { canAccessEndpoint: true }
    } catch (error) {
      // Check if it's a connection refused error - this means we CAN access localhost
      // but Cytoscape Desktop isn't running. This is "success" for permissions.
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorName = error instanceof Error ? error.name : ''
      
      // ERR_CONNECTION_REFUSED or similar network errors mean we can reach the endpoint
      // but the service isn't running. This indicates permissions are working.
      if (
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorName === 'TypeError' // Failed to fetch typically throws TypeError
      ) {
        // Connection refused means we can access the endpoint, just Cytoscape isn't running
        setState((prev) => ({ ...prev, isCyDeskAvailable: false }))
        return { canAccessEndpoint: true }
      }
      // Other errors might be permission-related (like CORS or blocked requests)
      setState((prev) => ({ ...prev, isCyDeskAvailable: false }))
      return {
        canAccessEndpoint: false,
        error: errorMessage,
      }
    } finally {
      // Create new abort controller for subsequent polling requests
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Start polling interval (subsequent requests can use abort signal)
      const id = setInterval(() => {
        void pollCytoscapeDesktopAvailability(abortController)
      }, POLLING_INTERVAL_MS)

      intervalIdRef.current = id
    }
  }, [])

  /**
   * Stop polling for Cytoscape Desktop availability.
   */
  const stopPolling = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current)
      intervalIdRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    ...state,
    startPolling,
    stopPolling,
    checkPermission,
  }
}
