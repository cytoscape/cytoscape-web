import { AppInstallOutcome, AppVersionChange } from '../AppVersionChange'
import { compareAppVersions } from './appVersion'

/**
 * True for an update to an older version: compatibility decided it, because
 * the installed version cannot run on this Cytoscape Web (`appVersionChange`).
 */
const replacesWithOlder = (from?: string, to?: string): boolean => {
  const order = compareAppVersions(to, from)
  return order !== undefined && order < 0
}

/**
 * User-facing text for what an install did (`installApp`'s outcome).
 *
 * An app the catalog already carries is updated or kept rather than added
 * (workspace-app-install-design.md §7.5), so the text names the version the
 * user now runs.
 *
 * @returns The message, or `undefined` for a rejected install, which has
 * already reported why
 */
export const appInstallMessage = (
  name: string,
  outcome: AppInstallOutcome,
): string | undefined => {
  switch (outcome.kind) {
    case 'new':
      return `Added ${name}`
    case 'update':
      if (replacesWithOlder(outcome.from, outcome.to)) {
        return `Replaced ${name} ${outcome.from}, which cannot run on this Cytoscape Web, with ${outcome.to}`
      }
      return outcome.to === undefined
        ? `Updated ${name}`
        : `Updated ${name} to ${outcome.to}`
    case 'same':
      return outcome.version === undefined
        ? `${name} is already installed`
        : `${name} ${outcome.version} is already installed`
    case 'older':
      return `${name} ${outcome.installed} is already installed; kept it instead of ${outcome.offered}`
    case 'incompatible':
      return `${name}${
        outcome.offered === undefined ? '' : ` ${outcome.offered}`
      } needs Cytoscape Web ${outcome.range}; kept ${
        outcome.kept ?? 'the installed version'
      }`
    case 'rejected':
      return undefined
  }
}

/**
 * What confirming an install would do to the version already installed, for
 * the install confirmation dialog.
 *
 * @returns The text, or `undefined` for an app that is not installed
 */
export const appInstallPreview = (
  change: AppVersionChange,
): string | undefined => {
  switch (change.kind) {
    case 'new':
      return undefined
    case 'update':
      if (replacesWithOlder(change.from, change.to)) {
        return `Replaces the installed version ${change.from}, which cannot run on this Cytoscape Web, with ${change.to}`
      }
      return change.from !== undefined && change.to !== undefined
        ? `Updates the installed version ${change.from} to ${change.to}`
        : 'Replaces the installed version'
    case 'same':
      return change.version === undefined
        ? 'Already installed'
        : `Version ${change.version} is already installed`
    case 'older':
      return `Version ${change.installed} is installed, which is newer; it is kept`
    case 'incompatible':
      return `Version ${change.offered ?? 'offered'} needs Cytoscape Web ${
        change.range
      }; the installed ${change.kept ?? 'version'} is kept`
  }
}

/** Whether the outcome changed which app or version is installed. */
export const isInstallChange = (outcome: AppInstallOutcome): boolean =>
  outcome.kind === 'new' || outcome.kind === 'update'

/**
 * How loudly to report an install: a change succeeded, a kept version is
 * information, and an offer that cannot run here is a warning.
 */
export const appInstallSeverity = (
  outcome: AppInstallOutcome,
): 'success' | 'info' | 'warning' =>
  isInstallChange(outcome)
    ? 'success'
    : outcome.kind === 'incompatible'
      ? 'warning'
      : 'info'
