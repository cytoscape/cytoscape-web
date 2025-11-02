// useUrlNavigation.ts
import { useNavigate, useSearchParams } from 'react-router-dom'
import { navigateToNetwork, updateSearchParams } from './url-manager'
import { NavigationConfig } from './NavigationConfig'
import { NavigationFunctions } from './NavigationFunctions'

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

  return {
    navigateToNetwork: (config: NavigationConfig) =>
      navigateToNetwork(config, navigate),

    updateSearchParams: (
      updates: Record<string, string | null>,
      replace: boolean = true,
    ) => updateSearchParams(searchParams, updates, setSearchParams, replace),
  }
}
