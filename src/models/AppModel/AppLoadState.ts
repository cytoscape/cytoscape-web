/**
 * Per-app runtime load state.
 * Tracks the lifecycle of loading a remote app bundle.
 */
export type AppLoadState = 'unloaded' | 'loading' | 'loaded' | 'failed'

/**
 * The states `setLoadState` may write.
 *
 * `'failed'` is excluded on purpose: a failed app must always carry a reason,
 * and `setLoadFailed` is the only action that records one. Widening this back
 * would let a caller reach `'failed'` while `setLoadState` clears
 * `loadErrors[id]`, leaving a row with a `failed` chip and nothing to show —
 * the defect #719 fixed.
 */
export type SettableAppLoadState = Exclude<AppLoadState, 'failed'>
