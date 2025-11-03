/**
 * NDEx API Configuration
 *
 * Module-level configuration for NDEx API operations.
 * The base URL is initialized from config.json at module load time.
 * This ensures production builds use the correct config, not the default.
 */
import appConfig from '../../assets/config.json'

let baseUrl: string = appConfig.ndexBaseUrl

/**
 * Gets the current NDEx base URL from configuration.
 *
 * @returns The configured NDEx base URL
 */
export const getNDExBaseUrl = (): string => {
  return baseUrl
}

/**
 * Sets the NDEx base URL.
 *
 * Useful for testing or runtime configuration overrides.
 * The base URL is automatically initialized from config.json at module load.
 *
 * @param url - The NDEx base URL to use
 */
export const setNDExBaseUrl = (url: string): void => {
  baseUrl = url
}
