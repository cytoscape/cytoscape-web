export const SelectedDataScope = {
  // default: If there are selected elements,
  // use selected elements. Otherwise, use all elements.
  dynamic: 'dynamic',

  // Only send the selected elements to the service.
  // If there is no selection, the menu item for this app will be grayed out.
  selected: 'selected',

  // Send all elements to the service, regardless of selection.
  all: 'all',
} as const

export type SelectedDataScope =
  (typeof SelectedDataScope)[keyof typeof SelectedDataScope]
