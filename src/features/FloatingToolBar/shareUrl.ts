/**
 * Share-URL construction (CW-514).
 *
 * The share link was previously assembled by raw string concatenation of
 * `location.origin + urlBaseName` with zero validation, so a misconfigured
 * `urlBaseName` (baked in at build time) or an unusual embedding context (this
 * app can run as a Module Federation remote, where `window.location` may be the
 * host page) could silently produce a malformed link — e.g. a mangled scheme.
 *
 * Building through the `URL` API guarantees a well-formed absolute URL or throws,
 * so callers can surface an error instead of copying garbage to the clipboard.
 */

/**
 * Normalize a build-time base path (`urlBaseName`) into a clean leading path
 * segment: `''` / `'/'` → `''`; `'/cytoscape/'` → `'/cytoscape'`;
 * `'cytoscape'` → `'/cytoscape'`.
 */
export const normalizeBaseName = (baseName: string | undefined): string => {
  if (baseName == null) {
    return ''
  }
  const trimmed = baseName.trim().replace(/\/+$/, '')
  if (trimmed === '' || trimmed === '/') {
    return ''
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/**
 * Build a shareable network URL of the form
 * `<origin><baseName>/0/networks/<networkId>?<query>`.
 *
 * The `0` workspace segment is a deliberate placeholder — workspace ids are not
 * portable across browsers, so routing ignores it (see ROUTING_SPECIFICATION.md).
 *
 * @param origin    an absolute origin such as `https://web-stage.cytoscape.org`
 * @param baseName  the build-time base path (`urlBaseName` from config)
 * @param networkId the network to share
 * @param query     an already-encoded query string (no leading `?`), or `''`
 * @throws {TypeError} if `origin` is not a valid absolute URL
 */
export const buildShareUrl = (
  origin: string,
  baseName: string | undefined,
  networkId: string,
  query: string,
): string => {
  // Throws TypeError on a malformed origin — the caller catches and reports.
  const url = new URL(origin)
  const base = normalizeBaseName(baseName)
  url.pathname = `${base}/0/networks/${networkId}`.replace(/\/{2,}/g, '/')
  url.search = query
  return url.toString()
}
