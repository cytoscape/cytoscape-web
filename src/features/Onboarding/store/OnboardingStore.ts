import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { logUi } from '../../../debug'
import {
  loadOnboardingState,
  OnboardingPersistedState,
  saveOnboardingState,
} from './onboardingPersistence'

/**
 * Onboarding state store.
 *
 * Tracks first-run status, completed tours, and the currently running tour.
 * Persistence is localStorage-backed (see {@link onboardingPersistence}); the
 * persisted slice is hydrated synchronously at store creation.
 */
export interface OnboardingState extends OnboardingPersistedState {
  /** Id of the tour currently running, or null if none is active. */
  activeTour: string | null
}

export interface OnboardingActions {
  /** Mark the first-run welcome dialog as seen (dismiss/skip/complete). */
  markWelcomeSeen: () => void
  /** Start a tour by id (also marks the welcome as seen). */
  startTour: (tourId: string) => void
  /** Stop the active tour without recording completion (skipped/closed). */
  stopTour: () => void
  /** Record a tour as completed and clear the active tour. */
  completeTour: (tourId: string) => void
  /** Record a contextual hint as dismissed so it does not reappear. */
  dismissHint: (hintId: string) => void
  /** Reset all onboarding state (used by tests and a "restart onboarding" action). */
  reset: () => void
}

export type OnboardingStore = OnboardingState & OnboardingActions

const persist = (state: OnboardingState): void => {
  saveOnboardingState({
    hasSeenWelcome: state.hasSeenWelcome,
    completedTours: state.completedTours,
    dismissedHints: state.dismissedHints,
  })
}

export const useOnboardingStore = create(
  immer<OnboardingStore>((set) => ({
    ...loadOnboardingState(),
    activeTour: null,

    markWelcomeSeen: () => {
      set((state) => {
        state.hasSeenWelcome = true
        persist(state)
      })
    },

    startTour: (tourId: string) => {
      logUi.info('Starting onboarding tour', tourId)
      set((state) => {
        state.hasSeenWelcome = true
        state.activeTour = tourId
        persist(state)
      })
    },

    stopTour: () => {
      set((state) => {
        state.activeTour = null
      })
    },

    completeTour: (tourId: string) => {
      logUi.info('Completed onboarding tour', tourId)
      set((state) => {
        state.hasSeenWelcome = true
        state.activeTour = null
        if (!state.completedTours.includes(tourId)) {
          state.completedTours.push(tourId)
        }
        persist(state)
      })
    },

    dismissHint: (hintId: string) => {
      set((state) => {
        if (!state.dismissedHints.includes(hintId)) {
          state.dismissedHints.push(hintId)
          persist(state)
        }
      })
    },

    reset: () => {
      set((state) => {
        state.hasSeenWelcome = false
        state.completedTours = []
        state.dismissedHints = []
        state.activeTour = null
        persist(state)
      })
    },
  })),
)
