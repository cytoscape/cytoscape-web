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

/** Read persisted onboarding state, falling back to defaults on any failure. */
export const loadOnboardingState = (): OnboardingPersistedState => {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (raw == null) {
      return { ...DEFAULT_ONBOARDING_STATE }
    }
    const parsed = JSON.parse(raw) as Partial<OnboardingPersistedState>
    return {
      hasSeenWelcome: parsed.hasSeenWelcome ?? false,
      completedTours: Array.isArray(parsed.completedTours)
        ? parsed.completedTours
        : [],
      dismissedHints: Array.isArray(parsed.dismissedHints)
        ? parsed.dismissedHints
        : [],
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
