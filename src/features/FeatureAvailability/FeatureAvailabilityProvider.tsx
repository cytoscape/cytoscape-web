import React, { ReactNode, useContext, useMemo } from 'react'

import { FeatureAvailabilityContext } from './FeatureAvailabilityContext'
import { useFeatureAvailabilityPolling } from './useFeatureAvailabilityPolling'

/**
 * Provider component that manages feature availability state and provides it via context.
 *
 * This provider:
 * - Uses the polling hook to manage state and polling logic
 * - Computes tooltip text based on state
 * - Provides state and tooltip to child components via context
 *
 * @param children - React children to wrap with the provider
 */
export const FeatureAvailabilityProvider: React.FC<{
  children: ReactNode
}> = ({ children }) => {
  // Use the polling hook to get current state
  const state = useFeatureAvailabilityPolling()

  // Compute tooltip based on state
  const tooltip = useMemo(() => {
    if (state.isSafari) {
      return 'This feature is not available in Safari.'
    }
    if (!state.isCyDeskAvailable) {
      return 'To use this feature, you need Cytoscape running 3.8.0 or higher on your machine (default port 1234).'
    }
    return 'Open a copy of the current network in Cytoscape Desktop.'
  }, [state.isSafari, state.isCyDeskAvailable])

  return (
    <FeatureAvailabilityContext.Provider value={{ state, tooltip }}>
      {children}
    </FeatureAvailabilityContext.Provider>
  )
}

export const useFeatureAvailability = () =>
  useContext(FeatureAvailabilityContext)
