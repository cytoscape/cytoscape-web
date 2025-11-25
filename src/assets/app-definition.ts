/**
 * This is the list of apps actually used in the app.
 * When these functions are called, then the actual import will happen.
 *
 * NOTE: Only include apps that are configured in apps.json.
 * If an app is not in apps.json, webpack won't configure it as a remote
 * and the build will fail with "Module not found" errors.
 */
export const appImportMap = {
  simpleMenu: () => import('simpleMenu/SimpleMenuApp' as any),
  simplePanel: () => import('simplePanel/SimplePanelApp' as any),
}
