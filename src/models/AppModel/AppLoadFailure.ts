/**
 * Why a remote app failed to load, as data rather than prose.
 *
 * `AppLoadState` stays the bare four-value string (`AppLoadState.ts`); the
 * reason lives beside it in `AppState.loadErrors`, keyed by the same catalog
 * id. Each variant carries the identifiers the user needs to act — the URL
 * that was fetched, the two ids that disagreed — so the store holds no
 * user-facing English and the UI can branch on `code` instead of matching a
 * sentence. `appLoadFailureMessage` in the AppManager feature turns a failure
 * into text.
 */
export type AppLoadFailure =
  /** The catalog URL is not from an origin `appInstallAllowedOrigins` permits. */
  | { readonly code: 'origin-blocked'; readonly url: string }
  /**
   * The `remoteEntry.js` request or the federation entry evaluation threw.
   * Not retryable in-tab: the federation runtime memoizes the rejected entry
   * promise for the life of the page (see #719).
   */
  | {
      readonly code: 'fetch-failed'
      readonly url: string
      readonly message: string
    }
  /** The bundle loaded but its `./AppConfig` module has no default export. */
  | { readonly code: 'no-app-config'; readonly url: string }
  /** The bundle's own `CyApp.id` differs from the catalog id. */
  | {
      readonly code: 'id-mismatch'
      readonly url: string
      readonly expected: string
      readonly received: string
    }
  /** The bundle loaded, but the app's `mount()` threw. The one retryable cause. */
  | { readonly code: 'mount-failed'; readonly message: string }

/** Codes retrying can succeed for. Everything else fails identically forever. */
const RETRYABLE_APP_LOAD_FAILURES: ReadonlySet<AppLoadFailure['code']> =
  new Set(['mount-failed'])

/**
 * True when re-running activation could plausibly succeed. Only
 * `mount-failed` qualifies — see the cause table in #719.
 */
export const isRetryableAppLoadFailure = (
  failure: AppLoadFailure | undefined,
): boolean =>
  failure !== undefined && RETRYABLE_APP_LOAD_FAILURES.has(failure.code)
