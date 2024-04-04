/**
 * Type of the filter UI.
 */
export const FilterWidgetType = {
  CHECKBOX: 'checkbox',
  RADIOBUTTON: 'radiobutton',
  SLIDER: 'slider',
} as const

export type FilterWidgetType =
  (typeof FilterWidgetType)[keyof typeof FilterWidgetType]
