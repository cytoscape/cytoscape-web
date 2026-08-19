import { satisfies, valid, validRange } from 'semver'

import { logApp } from '../../../debug'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { AppSource } from '../../../models/AppModel/InstalledApp'
import { parseManifest } from '../manifest/parseManifest'

/**
 * Trust-boundary helpers for installing external apps.
 *
 * Pure and framework-free: every externally supplied entry (install intent,
 * Install from URL, snapshot restore) must pass through these gates before its
 * remote bundle is allowed to load. See workspace-app-install-design.md §9.
 */

/**
 * Host version injected by webpack DefinePlugin. Undefined outside a webpack
 * build (e.g. unit tests), where callers may pass an explicit version.
 */
const HOST_VERSION: string | undefined =
  typeof REACT_APP_VERSION !== 'undefined' ? REACT_APP_VERSION : undefined

/**
 * Validate a fetched single-entry manifest and return its one entry.
 *
 * Runs the standard `parseManifest()` unchanged (so a one-element
 * `AppCatalogEntry[]` is validated, normalized, and deduplicated), then
 * returns the first entry. Returns undefined for an empty or invalid manifest;
 * warns and uses the first entry if more than one is present.
 */
export function parseSingleEntryManifest(
  data: unknown,
): AppCatalogEntry | undefined {
  const entries = parseManifest(data)
  if (entries.length === 0) return undefined
  if (entries.length > 1) {
    logApp.warn(
      `[installGate]: single-entry manifest contained ${entries.length} entries; using the first ("${entries[0].id}")`,
    )
  }
  return entries[0]
}

/**
 * True if this deployment has opted in to installing apps served from localhost.
 *
 * The opt-in names the origin it applies to instead of being a boolean, and is
 * honoured only when it matches the origin actually being served. That is what
 * makes it safe to commit: `src/assets/config.json` is the development server's
 * configuration (README, "Build for production"), and a production build starts
 * from a copy of it, editing a documented list of fields that does not include
 * this one. A boolean copied forward would silently enable localhost installs in
 * production; an origin copied forward matches nothing and does nothing.
 *
 * Every unusable value is off. This is the one field where a typo could widen
 * the gate rather than narrow it, so there is no input that means "any origin".
 */
export function isLocalhostAppOptIn(
  configuredOrigin: string | undefined,
  currentOrigin: string | undefined = window.location?.origin,
): boolean {
  if (configuredOrigin === undefined) return false

  // The type says string, but the value reaches here from config.json, which
  // nothing validates. A non-string must be off rather than a crash.
  if (typeof configuredOrigin !== 'string') {
    logApp.warn(
      `[installGate]: allowsLocalhostAppsOn must be a string, got ${typeof configuredOrigin}; localhost app installs stay disabled`,
    )
    return false
  }

  if (configuredOrigin.trim() === '') return false

  let configured: string
  try {
    configured = new URL(configuredOrigin).origin
  } catch {
    logApp.warn(
      `[installGate]: allowsLocalhostAppsOn is not a valid URL ("${configuredOrigin}"); localhost app installs stay disabled`,
    )
    return false
  }

  // A non-special scheme ("foo:bar") parses but yields the opaque origin "null",
  // which would then match any opaque origin. Refused so that no input can widen
  // the gate by accident.
  if (configured === 'null') {
    logApp.warn(
      `[installGate]: allowsLocalhostAppsOn ("${configuredOrigin}") has no usable origin; localhost app installs stay disabled`,
    )
    return false
  }

  return currentOrigin !== undefined && configured === currentOrigin
}

/**
 * True if `url`'s origin is allowed for app install.
 *
 * Allowed when the origin is in `allowedOrigins`, or when the URL is a
 * localhost origin and localhost apps are permitted here — which they are when
 * the host itself runs on localhost, or when this deployment opted in through
 * `allowsLocalhostAppsOn` (see `isLocalhostAppOptIn`). Invalid URLs are
 * rejected.
 *
 * The opt-in cannot be expressed as an allow-list entry: `parsed.origin`
 * carries the port, the match is exact, and a dev server's port varies per
 * developer and per app, so allow-listing "localhost" would mean allow-listing
 * one port.
 *
 * `allowsLocalhostAppsOn` is optional and omitting it means off, so a caller
 * that has not been updated fails closed rather than open.
 */
export function isAllowedOrigin(
  url: string,
  allowedOrigins: string[],
  allowsLocalhostAppsOn?: string,
): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (allowedOrigins.includes(parsed.origin)) return true

  const hostIsLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  const urlIsLocalhost =
    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'

  return (
    (hostIsLocalhost || isLocalhostAppOptIn(allowsLocalhostAppsOn)) &&
    urlIsLocalhost
  )
}

/**
 * True if a catalog entry may be loaded as code.
 *
 * The catalog is the one install path that never had an origin check, which is
 * how a user-set Manifest Source could load whatever it named. It cannot simply
 * be handed to `isAllowedOrigin`, though: the deployment's own default catalog
 * deliberately serves apps from origins that are not on the install allow-list.
 * `src/assets/apps.json` ships every bundled app from `cytoscape.org` while
 * `appInstallAllowedOrigins` names `apps.cytoscape.org`, so the naive fix would
 * disable every app the product comes with.
 *
 * The distinction is **provenance, not origin**. Entries from the deployment's
 * own default manifest are the operator's own list, as trusted as the
 * deployment serving them. Everything else — a manifest the *user* pointed at,
 * an App Store install, a restored snapshot — goes through the same gate as the
 * install paths, so an organization's catalog works by being allow-listed
 * rather than by being unchecked.
 */
export function isCatalogEntryAllowed(
  url: string,
  provenance: AppSource,
  manifestIsUserSet: boolean,
  allowedOrigins: string[],
  allowsLocalhostAppsOn?: string,
): boolean {
  if (provenance === 'manifest' && !manifestIsUserSet) return true
  return isAllowedOrigin(url, allowedOrigins, allowsLocalhostAppsOn)
}

/**
 * True if the host version satisfies the app's `compatibleHostVersions`
 * semver range.
 *
 * An undefined/empty range is compatible. An unparsable range logs a warning
 * and is treated as compatible (bad metadata must not block installs). If the
 * host version cannot be determined or is not valid semver, returns true.
 */
export function isHostCompatible(
  range: string | undefined,
  hostVersion: string | undefined = HOST_VERSION,
): boolean {
  if (range === undefined || range.trim() === '') return true
  if (validRange(range) === null) {
    logApp.warn(
      `[installGate]: invalid compatibleHostVersions range "${range}"; treating as compatible`,
    )
    return true
  }
  if (hostVersion === undefined || valid(hostVersion) === null) return true
  return satisfies(hostVersion, range)
}

/**
 * Validate a custom manifest URL, returning an error message or undefined.
 *
 * Lives here rather than in AppSettingsDialog because it is a trust-boundary
 * check like its neighbours, and because as a module-private function in a
 * component file it could not be tested directly.
 *
 * Only https: in general. http: is additionally accepted when the page itself
 * is on localhost (long-standing dev convenience), and — narrowly — when this
 * deployment opted in to localhost apps and the URL is itself a localhost
 * address.
 */
export function validateManifestUrl(
  input: string,
  allowsLocalhostAppsOn?: string,
): string | undefined {
  try {
    const parsed = new URL(input, window.location.origin)
    const isDev =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    if (parsed.protocol === 'https:') return undefined
    if (isDev && parsed.protocol === 'http:') return undefined
    // A deployment that opted in to localhost apps must be able to name a
    // localhost manifest, or every other part of that flow is unreachable: this
    // is a protocol check, and on a public origin `isDev` is false, so a
    // developer could not even type their dev server's URL.
    //
    // Narrower than the `isDev` case above deliberately. That one allows any
    // http: URL, which is tolerable when the page itself is on localhost; here
    // the page is a shared deployment, so the relaxation is confined to the
    // localhost addresses the opt-in is actually about.
    const urlIsLocalhost =
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (
      parsed.protocol === 'http:' &&
      urlIsLocalhost &&
      isLocalhostAppOptIn(allowsLocalhostAppsOn)
    ) {
      return undefined
    }
    return 'URL must use HTTPS protocol'
  } catch {
    return 'Invalid URL format'
  }
}
