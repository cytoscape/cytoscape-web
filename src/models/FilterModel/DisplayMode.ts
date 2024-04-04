/**
 * How to visualize the filtered results.
 *
 * If "select", then the filter will select those objects. If
 * "show_hide", then the filter will show the selected items only.
 */
export const DisplayMode = {
  SELECT: 'select',
  SHOW_HIDE: 'show_hide',
} as const

export type DisplayMode = (typeof DisplayMode)[keyof typeof DisplayMode]
