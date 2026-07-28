/**
 * localStorage persistence for onboarding state.
 *
 * Mirrors the ad-hoc "seen once" convention already used across the app
 * (see MultiTabNotice's `cyweb.multiTabNotice.dismissed`). Kept self-contained
 * in the Onboarding feature rather than expanding the deprecated-MF UiStateStore.
 */

export const ONBOARDING_STORAGE_KEY = 'cyweb.onboarding'

export interface OnboardingPersistedState {
  hasSeenWelcome: boolean
  completedTours: string[]
  dismissedHints: string[]
}

export const DEFAULT_ONBOARDING_STATE: OnboardingPersistedState = {
  hasSeenWelcome: false,
  completedTours: [],
  dismissedHints: [],
}

/** The string entries of an unknown value, or [] if it is not an array. */
const stringsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []

/** Read persisted onboarding state, falling back to defaults on any failure. */
export const loadOnboardingState = (): OnboardingPersistedState => {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (raw == null) {
      return { ...DEFAULT_ONBOARDING_STATE }
    }
    // Treated as untrusted: localStorage is user-writable and may hold a value
    // written by an older or newer build, so each field is checked rather than
    // asserted. Anything unexpected falls back to its default.
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_ONBOARDING_STATE }
    }
    const record = parsed as Record<string, unknown>
    return {
      hasSeenWelcome:
        typeof record.hasSeenWelcome === 'boolean'
          ? record.hasSeenWelcome
          : DEFAULT_ONBOARDING_STATE.hasSeenWelcome,
      completedTours: stringsOf(record.completedTours),
      dismissedHints: stringsOf(record.dismissedHints),
    }
  } catch {
    // localStorage unavailable (privacy mode) or corrupt JSON — start fresh.
    return { ...DEFAULT_ONBOARDING_STATE }
  }
}

/** Persist onboarding state, degrading gracefully if storage is unavailable. */
export const saveOnboardingState = (state: OnboardingPersistedState): void => {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Degrade gracefully — onboarding will simply reappear next session.
  }
}
