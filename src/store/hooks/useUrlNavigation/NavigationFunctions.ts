import { NavigationConfig } from './NavigationConfig'

/**
 * Interface for navigation functions
 *
 * This interface defines the functions used for navigating to a network
 * and updating search parameters in the URL.
 *
 * @interface NavigationFunctions
 *
 */
export interface NavigationFunctions {
  /**
   *
   * Navigate to a specific current network with optional search parameters.
   *
   * @param {NavigationConfig} config - Configuration for navigation
   * @returns {void}
   */
  navigateToNetwork: (config: NavigationConfig) => void

  /**
   *
   * Update search parameters for the current network's URL
   *
   * @param {Record<string, string | null>} updates - Key-value pairs to update
   * @param {boolean} [replace=false] - Whether to replace the current history entry
   *
   * @returns {void}
   */
  updateSearchParams: (
    updates: Record<string, string | null>,
    replace?: boolean,
  ) => void
}
