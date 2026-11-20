import appConfig from '../assets/config.json'

/**
 * The app's root URL path: the router's basename, or `/`.
 *
 * For a full page load that must start over at the editor root, dropping the
 * current path and query. Reloading the current address after a clear would
 * keep a share link or an `?import=` URL, and the next boot would load it
 * straight back into the cache that was just cleared. The React side gets the
 * same value from `useHref('/')`; the boot shell has no router.
 */
export const appRootHref = (
  urlBaseName: string = appConfig.urlBaseName,
): string => (urlBaseName === '' ? '/' : urlBaseName)
