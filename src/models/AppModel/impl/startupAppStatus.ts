import { AppStatus } from '../AppStatus'

/**
 * The status an app starts a session with, before anything is loaded.
 *
 * A **core app** is one the deployment's own `apps.json` lists. It is on
 * unless the current workspace records that the user turned it off, so it
 * starts on in a workspace that has never seen it: the first start, a new
 * workspace, or an app added to `apps.json` since. Only `inactive` counts as
 * turned off; `error` is what a failed activation left behind, so the app is
 * tried again.
 *
 * Any other app (installed from the App Store or a link, restored from a
 * workspace, or listed by a Manifest Source the user set) starts with the
 * status its record holds, and has none when there is no record.
 *
 * @param recorded The status in the workspace's `installedApps` record, if any
 * @param isCoreApp Whether the deployment's default `apps.json` lists the app
 * @returns The status to seed, or `undefined` to leave the app unseeded
 */
export const startupAppStatus = (
  recorded: AppStatus | undefined,
  isCoreApp: boolean,
): AppStatus | undefined => {
  if (!isCoreApp) return recorded
  return recorded === AppStatus.Inactive ? AppStatus.Inactive : AppStatus.Active
}
