import React, {
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'

import {
  FeatureAvailabilityAction,
  FeatureAvailabilityActionType,
  FeatureAvailabilityContext,
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
 * The provider checks Cytoscape Desktop availability every 5 seconds.
 */
const POLLING_INTERVAL_MS = 5000
/**
 * Reducer for feature availability state.
 * Handles all state updates based on action types.
 */
export const featureAvailabilityReducer = (
  state: FeatureAvailabilityState,
  action: FeatureAvailabilityAction,
): FeatureAvailabilityState => {
  switch (action.type) {
    case FeatureAvailabilityActionType.SET_CYDESK_AVAILABLE:
      return { ...state, isCyDeskAvailable: true }
    case FeatureAvailabilityActionType.SET_CYDESK_UNAVAILABLE:
      return { ...state, isCyDeskAvailable: false }
    case FeatureAvailabilityActionType.SET_IS_SAFARI:
      return { ...state, isSafari: true }
    case FeatureAvailabilityActionType.SET_NOT_SAFARI:
      return { ...state, isSafari: false }
    default:
      return state
  }
}

export const FeatureAvailabilityProvider: React.FC<{
  children: ReactNode
}> = ({ children }) => {
  const [state, dispatch] = useReducer(featureAvailabilityReducer, initialState)

  /**
   * Polls the Cytoscape Desktop endpoint to check availability.
   * Updates state based on the response or handles errors gracefully.
   */
  const pollCytoscapeDesktopAvailability = async (
    abortController: AbortController,
  ) => {
    try {
      const response = await fetch(CYTOSCAPE_ENDPOINT, {
        signal: abortController.signal,
      })
      if (response.ok) {
        dispatch({
          type: FeatureAvailabilityActionType.SET_CYDESK_AVAILABLE,
        })
      } else {
        dispatch({ type: FeatureAvailabilityActionType.SET_CYDESK_UNAVAILABLE })
      }
    } catch (error) {
      // Ignore AbortError (happens during cleanup)
      // For other errors, mark Cytoscape Desktop as unavailable
      if (error instanceof Error && error.name !== 'AbortError') {
        dispatch({ type: FeatureAvailabilityActionType.SET_CYDESK_UNAVAILABLE })
      } else if (!(error instanceof Error)) {
        // Handle non-Error objects (shouldn't happen with fetch, but be safe)
        dispatch({ type: FeatureAvailabilityActionType.SET_CYDESK_UNAVAILABLE })
      }
    }
  }

  const tooltip = useMemo(() => {
    if (state.isSafari) {
      return 'This feature is not available in Safari.'
    }
    if (!state.isCyDeskAvailable) {
      return 'To use this feature, you need Cytoscape running 3.8.0 or higher on your machine (default port 1234).'
    }
    return 'Open a copy of the current network in Cytoscape Desktop.'
  }, [state.isSafari, state.isCyDeskAvailable])

  useEffect(() => {
    // Detect Safari browser (which doesn't support this feature)
    const userAgent = navigator.userAgent.toLowerCase()
    const isSafari =
      userAgent.includes('safari') && !userAgent.includes('chrome')

    dispatch({
      type: isSafari
        ? FeatureAvailabilityActionType.SET_IS_SAFARI
        : FeatureAvailabilityActionType.SET_NOT_SAFARI,
    })

    // Skip polling if Safari (feature not supported)
    if (isSafari) {
      return
    }

    // Start polling for Cytoscape Desktop availability
    const abortController = new AbortController()
    const intervalId = setInterval(() => {
      pollCytoscapeDesktopAvailability(abortController)
    }, POLLING_INTERVAL_MS)

    // Cleanup: stop polling and abort any in-flight requests
    return () => {
      clearInterval(intervalId)
      abortController.abort()
    }
  }, [])

  return (
    <FeatureAvailabilityContext.Provider value={{ state, tooltip }}>
      {children}
    </FeatureAvailabilityContext.Provider>
  )
}

export const useFeatureAvailability = () =>
  useContext(FeatureAvailabilityContext)
