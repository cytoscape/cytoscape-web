/**
 * Heading ids for manual pages. Matches the anchors Sphinx/MyST generated for
 * the Read the Docs manual (lowercase, punctuation dropped, spaces to
 * dashes), so `Styles.html#how-mappings-work` keeps working at
 * `/manual/styles#how-mappings-work`.
 */
export const slugifyHeading = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

/** Resolves an image `src` from page content against the app's base URL. */
export const resolveManualAsset = (src: string, baseUrl: string): string => {
  if (/^(https?:|data:|\/)/.test(src)) {
    return src
  }
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${base}${src}`
}

/**
 * Classifies an `href` from page content.
 *
 * - `page`: another manual page (`styles`, `styles#mappings`, `#mappings`),
 *   followed with client-side navigation.
 * - `external`: anything with a scheme, opened in a new tab.
 * - `app`: the editor (`/` or a path outside /manual). A full page load, so
 *   the tab never carries the manual's sandbox database into the editor.
 */
export type ManualLinkKind = 'page' | 'external' | 'app'

export const classifyManualLink = (href: string): ManualLinkKind => {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    return 'external'
  }
  if (href.startsWith('/')) {
    return 'app'
  }
  return 'page'
}
