/**
 * How to visualize the filtered results.
 *
 * If "select", then the filter will select those objects. If
 * "show_hide", then the filter will show the selected items only.
 *
 * Note: SHOW_HIDE mode is kept in the model for specification compatibility,
 * but it is NOT currently implemented in the UI or renderer. It was removed
 * due to architectural issues:
 * - It hijacked application selection state to map to visibility, causing selection bugs
 * - Search functionality did not work properly with show/hide mode
 * - Selection for show/hide mode was barely functional
 * - It was only used for visibility filters for HCX elements, which now use visibility bypass maps
 *
 * Filters now always use SELECT mode, and visibility is controlled independently through
 * visibility bypass maps in the visual style store.
 *
 * SHOW_HIDE mode needs to be reworked in the future to properly account for all these cases.
 */
export const DisplayMode = {
  SELECT: 'select',
  SHOW_HIDE: 'show_hide',
} as const

export type DisplayMode = (typeof DisplayMode)[keyof typeof DisplayMode]
