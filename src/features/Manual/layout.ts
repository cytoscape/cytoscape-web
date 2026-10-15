/**
 * The manual's page layouts, switchable while we compare them.
 *
 * - `current`: the original layout — page list left, text, "On this page" right.
 * - `nested`: the page list nests the current page's sections, with the
 *   section in view highlighted; readable-measure typography; one text
 *   column.
 * - `split`: `nested`, plus the page's live demo pinned in a right-hand column
 *   while the text scrolls beside it. Falls back to `nested` below the `lg`
 *   breakpoint and on pages without a demo.
 *
 * Chosen by `?layout=` or the switch in the app bar, and remembered per
 * browser.
 */
export const MANUAL_LAYOUTS = ['current', 'nested', 'split'] as const
export type ManualLayout = (typeof MANUAL_LAYOUTS)[number]

export const DEFAULT_MANUAL_LAYOUT: ManualLayout = 'split'
export const MANUAL_LAYOUT_STORAGE_KEY = 'cyweb.manual.layout'

export const isManualLayout = (value: unknown): value is ManualLayout =>
  typeof value === 'string' &&
  (MANUAL_LAYOUTS as readonly string[]).includes(value)

/** `?layout=` wins, then the remembered choice, then the default. */
export const resolveManualLayout = (
  search: string,
  stored: string | null,
): ManualLayout => {
  const fromUrl = new URLSearchParams(search).get('layout')
  if (isManualLayout(fromUrl)) return fromUrl
  if (isManualLayout(stored)) return stored
  return DEFAULT_MANUAL_LAYOUT
}

export const readStoredLayout = (): string | null => {
  try {
    return window.localStorage.getItem(MANUAL_LAYOUT_STORAGE_KEY)
  } catch {
    return null
  }
}

export const storeLayout = (layout: ManualLayout): void => {
  try {
    window.localStorage.setItem(MANUAL_LAYOUT_STORAGE_KEY, layout)
  } catch {
    // A refused write only loses the remembered choice.
  }
}
