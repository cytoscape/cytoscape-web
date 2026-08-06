/**
 * Shared style for the compact icon buttons in the column meaning / append /
 * data-type forms, so the three renderers stay consistent. `action.selected`
 * (not a hardcoded gray) keeps the selected state legible in dark mode.
 */
export const compactButtonSx = {
  minWidth: 0,
  px: 0.75,
  py: 0.25,
  color: 'text.primary',
  borderColor: 'divider',
  textTransform: 'none',
} as const
