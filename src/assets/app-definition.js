/**
 * This is the list of apps actually used in the app.
 * When these functions are called, then the actual import will happen.
 */
export const appImportMap = {
  hello: () => import('hello/HelloApp'),
  simpleMenu: () => import('simpleMenu/SimpleMenuApp'),
  simplePanel: () => import('simplePanel/SimplePanelApp'),
}
