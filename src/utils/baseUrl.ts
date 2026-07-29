/**
 * Normalizes a URL base path to always end with a single trailing slash, so
 * config values like "/cytoscape" and "/cytoscape/" (or "") behave the same
 * when path segments are appended (e.g. the silent-check-sso.html URI).
 */
export const ensureTrailingSlash = (basePath: string): string =>
  basePath.endsWith('/') ? basePath : `${basePath}/`
