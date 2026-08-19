import { satisfies, valid, validRange } from 'semver'

import { logApp } from '../../../debug'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
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
 * Allowed when the origin is in `allowedOrigins`, or — when the host itself
 * runs on localhost — when the URL is a localhost origin (dev convenience,
 * same precedent as `validateManifestUrl` in AppSettingsDialog). Invalid URLs
 * are rejected.
 */
export function isAllowedOrigin(
  url: string,
  allowedOrigins: string[],
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

  return hostIsLocalhost && urlIsLocalhost
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
