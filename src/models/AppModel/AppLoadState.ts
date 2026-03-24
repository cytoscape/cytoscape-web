/**
 * Per-app runtime load state.
 * Tracks the lifecycle of loading a remote app bundle.
 */
export type AppLoadState = 'unloaded' | 'loading' | 'loaded' | 'failed'
