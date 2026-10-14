import { AppLoadFailure } from '../AppLoadFailure'

/**
 * User-facing text for a load failure.
 *
 * `AppLoadFailure` carries identifiers only; this is the one place that turns
 * a code into English. It lives in the model layer, not in the AppManager
 * feature, because `useAppManager` needs it for the toast and `src/data` may
 * not import from `src/features` (see `src/data/layering.test.ts`).
 *
 * Every message names the cause and what the user can do about it. For the two
 * mis-packaging codes that is "report it to the publisher" — the user caused
 * nothing and can fix nothing.
 */
export const appLoadFailureMessage = (failure: AppLoadFailure): string => {
  switch (failure.code) {
    case 'origin-blocked':
      return `Blocked: ${failure.url} is not an allowed app origin.`
    case 'fetch-failed':
      return `Could not fetch ${failure.url} (${failure.message}). Reload the page to try again.`
    case 'no-app-config':
      return `The bundle at ${failure.url} exports no AppConfig. The app is mis-packaged — report it to its publisher.`
    case 'id-mismatch':
      return `The bundle declares the id "${failure.received}" but the catalog lists "${failure.expected}". The app is mis-packaged — report it to its publisher.`
    case 'mount-failed':
      return `The app loaded but failed to start: ${failure.message}`
  }
}

/**
 * The same text prefixed with the app's name, for a toast shown away from the
 * App Manager list.
 */
export const appLoadFailureToast = (
  name: string,
  failure: AppLoadFailure,
): string => `Could not load "${name}". ${appLoadFailureMessage(failure)}`
