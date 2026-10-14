// useUrlNavigation.ts
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { NavigationConfig } from './NavigationConfig'
import { NavigationFunctions } from './NavigationFunctions'
import { navigateToNetwork, updateSearchParams } from './urlManager'

/**
 * Custom hook for URL navigation and search parameter management
 *
 * This hook provides functions to navigate to a specific network
 * and update search parameters in the URL.
 *
 * This should be used in ALL components that need to navigate
 * to centralize the URL management in one place and integration
 * to the undo/redo system in the future.
 *
 * @returns {NavigationFunctions} An object containing navigation
 * and search parameter functions
 *
 */
export const useUrlNavigation = (): NavigationFunctions => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Memoized so the returned functions (and object) keep a stable identity
  // across renders and can safely be used as hook dependencies by consumers
  return useMemo(
    () => ({
      navigateToNetwork: (config: NavigationConfig) =>
        navigateToNetwork(config, navigate),

      updateSearchParams: (
        updates: Record<string, string | null>,
        replace: boolean = true,
      ) => updateSearchParams(searchParams, updates, setSearchParams, replace),
    }),
    [navigate, searchParams, setSearchParams],
  )
}
