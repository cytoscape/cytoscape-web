import { gettingStartedTour } from './gettingStarted'
import { TourDef } from './types'

/**
 * Registry of all onboarding tours.
 *
 * This is the single source of truth the app renders from AND the CI anchor
 * test (test/playwright/onboarding-tour-anchors.spec.ts) enumerates. Add new
 * tours here; the anchor test will automatically verify their targets.
 */
export const TOURS: TourDef[] = [gettingStartedTour]

/** The tour launched on first run and by the Help-menu "Take a tour" item. */
export const DEFAULT_TOUR_ID = gettingStartedTour.id

export const getTour = (tourId: string | null): TourDef | undefined =>
  TOURS.find((tour) => tour.id === tourId)
