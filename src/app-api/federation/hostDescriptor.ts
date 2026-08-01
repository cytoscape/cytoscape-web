// The contract this host publishes to federated apps at boot.
//
// A remote's Module Federation runtime needs the host's remoteEntry.js URL to
// resolve its `cyweb/*` imports, and only the host knows it — `base` comes from
// config.json's urlBaseName, so the entry is not necessarily at the origin
// root. A remote that guessed (`location.origin + '/remoteEntry.js'`) would
// either 404 or, worse, load a SECOND copy of the host container.
//
// Kept next to FEDERATION_NAME / FEDERATION_FILENAME so the published
// descriptor cannot drift from what the build actually emits. Like
// federationExposes.ts, this file stays free of React and Vite-plugin imports
// so it is trivially importable from a Vitest unit test and cheap enough to sit
// in the boot chunk.
import { FEDERATION_FILENAME, FEDERATION_NAME } from './federationExposes'

/**
 * Version of the App API surface this host implements. Published so a future
 * version-skew check has something to read; nothing compares it today — see
 * the app-examples vite-migration spec §6.6.
 */
export const APP_API_VERSION = '1.0'

/**
 * Contract published to federated apps at boot. Immutable for the lifetime of
 * the page: once a remote has loaded, the MF runtime caches its Module against
 * the remoteInfo it was created with, so a later change here would not reach an
 * already-loaded app anyway. Freezing states that rather than implying an
 * update path that does not exist.
 */
export interface CyWebHostDescriptor {
  /**
   * Always 'cyweb'. Narrowed to a literal so a consumer can check it and so the
   * field means something — a `string` here is decoration nobody reads.
   */
  readonly name: 'cyweb'
  readonly remoteEntry: string
  readonly apiVersion: string
}

declare global {
  interface Window {
    readonly __CYWEB_HOST__?: CyWebHostDescriptor
  }
}

/**
 * Absolute URL of this host's remoteEntry.js.
 *
 * A pure function rather than an inline expression in bootstrap.tsx: the
 * regression test calls this exact function, and a test that re-derives the
 * expression tests only itself. `urlBaseName` is '/' in production today, so an
 * end-to-end run proves nothing about the based-deployment case this covers.
 *
 * @param base     Vite's resolved base (`import.meta.env.BASE_URL`), e.g. '/' or '/cytoscape/'
 * @param href     The page URL to resolve against (`window.location.href`)
 * @param filename The federation entry filename (FEDERATION_FILENAME)
 */
export const buildHostRemoteEntryUrl = (
  base: string,
  href: string,
  filename: string,
): string => new URL(`${base}${filename}`, href).href

/**
 * Installs the descriptor on `target` as a frozen, non-writable,
 * non-configurable property.
 *
 * Takes `target` rather than reaching for `window` so the immutability contract
 * — which is the part a remote depends on and the part nothing else would
 * notice breaking — is assertable from a unit test. bootstrap.tsx passes the
 * real `window`; the test passes a plain object.
 *
 * Call SYNCHRONOUSLY during boot-chunk evaluation. A remote's `beforeInit` hook
 * is synchronous and must never lose a race with this.
 */
export const publishHostDescriptor = (
  target: object,
  base: string,
  href: string,
): void => {
  Object.defineProperty(target, '__CYWEB_HOST__', {
    value: Object.freeze({
      name: FEDERATION_NAME,
      remoteEntry: buildHostRemoteEntryUrl(base, href, FEDERATION_FILENAME),
      apiVersion: APP_API_VERSION,
    }) satisfies CyWebHostDescriptor,
    writable: false,
    configurable: false,
  })
}
