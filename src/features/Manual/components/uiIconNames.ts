/**
 * Names `<UiIcon name="…" />` accepts. Data only, so content.test.ts can
 * check page files against it without loading the icons. UiIcon's map is
 * typed over this list: adding a name without an icon fails the type check.
 */
export const UI_ICON_NAMES = [
  'apply-layout',
  'fit',
  'open-in-cytoscape',
  'share',
  'search-settings',
  'open-panel',
  'insert-column',
  'import-table',
  'ndex-label',
  'local-label',
  'not-imported',
  'ndex-search',
  'sign-in',
] as const

export type UiIconName = (typeof UI_ICON_NAMES)[number]
