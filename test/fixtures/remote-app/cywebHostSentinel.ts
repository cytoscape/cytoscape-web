/**
 * Entry value a production build ships when no host descriptor is available.
 *
 * The SAME string the app-examples repo ships (see its vite-migration spec
 * §6.4). A fixture that used a different sentinel would prove nothing about the
 * contract real apps carry.
 *
 * Its own dependency-free module so vite.config.ts (Node) and mfRuntimePlugin.ts
 * (browser) share one definition and cannot drift.
 */
export const CYWEB_HOST_REQUIRED = 'cyweb:__CYWEB_HOST_REQUIRED__'
