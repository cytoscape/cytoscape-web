/**
 * This is the list of apps actually used in the app.
 * When these functions are called, then the actual import will happen.
 */
export const appImportMap = {
  hello: () => import('hello/HelloApp' as any),
  simpleMenu: () => import('simpleMenu/SimpleMenuApp' as any),
  simplePanel: () => import('simplePanel/SimplePanelApp' as any),
}
