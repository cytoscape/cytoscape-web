import { compare, valid } from 'semver'

import { AppCatalogEntry } from '../AppCatalogEntry'
import { AppVersionChange } from '../AppVersionChange'

/**
 * Compare two app versions as semantic versions: 3.1.2 is newer than 3.1.1,
 * and 3.2.0 is newer than 3.1.23. A pre-release sorts before its release.
 *
 * @returns A negative number when `a` is older, positive when newer, 0 when
 * equal; `undefined` when either is missing or not a valid semver, so the
 * caller keeps its rule for entries it cannot order.
 */
export const compareAppVersions = (
  a: string | undefined,
  b: string | undefined,
): number | undefined => {
  if (a === undefined || b === undefined) return undefined
  const parsedA = valid(a)
  const parsedB = valid(b)
  if (parsedA === null || parsedB === null) return undefined
  return compare(parsedA, parsedB)
}

/**
 * What installing `offered` would do to `installed`, the catalog's current
 * entry for the same id. See `AppVersionChange`.
 *
 * Compatibility comes first: an offer this host cannot run never replaces an
 * installed entry it can run, and one it can run replaces one it cannot,
 * whatever their versions. Versions decide only between two entries that
 * both run here, or both do not.
 *
 * @param isCompatible Whether this Cytoscape Web can run an entry
 *   (`compatibleHostVersions`); every entry counts as compatible by default
 */
export const appVersionChange = (
  offered: AppCatalogEntry,
  installed: AppCatalogEntry | undefined,
  isCompatible: (entry: AppCatalogEntry) => boolean = () => true,
): AppVersionChange => {
  if (installed === undefined) return { kind: 'new' }
  const offeredRuns = isCompatible(offered)
  const installedRuns = isCompatible(installed)
  if (!offeredRuns && installedRuns && offered.url !== installed.url) {
    return {
      kind: 'incompatible',
      ...(offered.version !== undefined && { offered: offered.version }),
      range: offered.compatibleHostVersions ?? '',
      ...(installed.version !== undefined && { kept: installed.version }),
    }
  }
  if (offeredRuns && !installedRuns && offered.url !== installed.url) {
    return {
      kind: 'update',
      ...(installed.version !== undefined && { from: installed.version }),
      ...(offered.version !== undefined && { to: offered.version }),
    }
  }
  if (offered.url === installed.url) {
    return {
      kind: 'same',
      ...(installed.version !== undefined && { version: installed.version }),
    }
  }
  const order = compareAppVersions(offered.version, installed.version)
  if (order === 0) {
    return {
      kind: 'same',
      ...(installed.version !== undefined && { version: installed.version }),
    }
  }
  if (order !== undefined && order < 0) {
    return {
      kind: 'older',
      // order is defined only when both versions are valid strings
      installed: installed.version as string,
      offered: offered.version as string,
    }
  }
  return {
    kind: 'update',
    ...(installed.version !== undefined && { from: installed.version }),
    ...(offered.version !== undefined && { to: offered.version }),
  }
}
