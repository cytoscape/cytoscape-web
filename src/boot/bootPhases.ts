// The boot pipeline, declared in one place.
//
// Every stage of startup is a named phase here. Adding a stage means adding a
// row, not finding the right place to wedge an `await` into a 200-line
// function — and because runBoot wraps each one, a new phase gets timing and
// error isolation without its author having to remember either.

export const BootPhase = {
  /** Runtime setup: immer Map/Set, debug, tab manager, analytics. */
  RUNTIME: 'runtime',
  /** Explicit IndexedDB open and schema check. */
  DATABASE: 'database',
  /** Keycloak silent SSO. Measured, never awaited — the app renders over it. */
  AUTH: 'auth',
  /** Workspace, network summaries and UI state read from IndexedDB. */
  WORKSPACE: 'workspace',
  /** A `:networkId` in the URL that the workspace does not already have. */
  DEEP_LINK: 'deep-link',
  /** `?import=<url>` CX2 imports. */
  IMPORTS: 'imports',
  /** Publish to the stores, start the event bus, fire cywebapi:ready. */
  PUBLISH: 'publish',
  /** `?installApp=` intents: fetch and classify, then hand to AppShell. */
  INTENTS: 'intents',
  /** Restore UI state from the URL, then navigate and strip the params. */
  ROUTE: 'route',
} as const

export type BootPhase = (typeof BootPhase)[keyof typeof BootPhase]

/**
 * What the boot shell says while a phase runs. Phases with no entry leave the
 * message alone — the user should see a handful of meaningful transitions,
 * not one line per internal stage.
 */
export const BOOT_PHASE_MESSAGE: Partial<Record<BootPhase, string>> = {
  [BootPhase.RUNTIME]: 'Loading application...',
  [BootPhase.DATABASE]: 'Loading application...',
  [BootPhase.WORKSPACE]: 'Loading workspace...',
  [BootPhase.DEEP_LINK]: 'Loading workspace...',
  [BootPhase.IMPORTS]: 'Importing network...',
  [BootPhase.PUBLISH]: 'Loading network...',
}

/**
 * Phases whose failure leaves the app unusable, so the boot stops and shows
 * the error shell. Everything else degrades: the phase is logged and skipped,
 * and the boot continues to a working — if less complete — workspace.
 *
 * DATABASE is the only one. A failed workspace read still reaches an empty
 * workspace; a failed import still reaches the workspace without that network.
 */
export const FATAL_BOOT_PHASES: ReadonlySet<BootPhase> = new Set([
  BootPhase.DATABASE,
])
