import { ReactElement, useEffect, useState } from 'react'

import { logUi } from '../../debug'
import { useOnboardingStore } from './store/OnboardingStore'
import { TourRunner } from './TourRunner'
import { DEFAULT_TOUR_ID } from './tours/registry'
import { WelcomeDialog } from './WelcomeDialog'

/** Event dispatched by AppShell once stores are hydrated and the app is ready. */
const APP_READY_EVENT = 'cywebapi:ready'
/** Fallback delay if the ready event is missed, so first-run still surfaces. */
const READY_FALLBACK_MS = 8000

/**
 * App-wide onboarding host. Mounted once at the App root (beside the
 * multi-tab / cookie notices). Shows the first-run Welcome dialog after the
 * app is ready, and always renders the tour runner (which is a no-op unless a
 * tour is active).
 */
export const OnboardingHost = (): ReactElement => {
  const hasSeenWelcome = useOnboardingStore((state) => state.hasSeenWelcome)
  const activeTour = useOnboardingStore((state) => state.activeTour)
  const startTour = useOnboardingStore((state) => state.startTour)
  const markWelcomeSeen = useOnboardingStore((state) => state.markWelcomeSeen)

  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    if (hasSeenWelcome) {
      // Nothing to wait for — user has already been onboarded.
      return
    }

    const onReady = (): void => {
      logUi.info('App ready — enabling first-run onboarding')
      setAppReady(true)
    }

    window.addEventListener(APP_READY_EVENT, onReady, { once: true })
    const fallback = window.setTimeout(onReady, READY_FALLBACK_MS)

    return () => {
      window.removeEventListener(APP_READY_EVENT, onReady)
      window.clearTimeout(fallback)
    }
  }, [hasSeenWelcome])

  const showWelcome = appReady && !hasSeenWelcome && activeTour == null

  return (
    <>
      <WelcomeDialog
        open={showWelcome}
        onSkip={markWelcomeSeen}
        onStartTour={() => startTour(DEFAULT_TOUR_ID)}
      />
      <TourRunner />
    </>
  )
}
