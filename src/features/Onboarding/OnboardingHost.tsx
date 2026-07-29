import { lazy, ReactElement, Suspense, useEffect, useState } from 'react'

import { logUi } from '../../debug'
import { useOnboardingStore } from './store/OnboardingStore'
import { DEFAULT_TOUR_ID } from './tours/registry'
import { WelcomeDialog } from './WelcomeDialog'

// react-joyride is ~104 KB and was 85% of this feature's chunk, which App,
// AppShell and bootstrap all statically import — so it landed on the cold-load
// critical path for every user, to render a tour most of them see once. Loading
// it only once a tour starts keeps it off that path; the fetch happens while
// the user is reacting to their own click on "Start tour".
const TourRunner = lazy(async () => ({
  default: (await import('./TourRunner')).TourRunner,
}))

/** Event dispatched by AppShell once stores are hydrated and the app is ready. */
const APP_READY_EVENT = 'cywebapi:ready'
/** Fallback delay if the ready event is missed, so first-run still surfaces. */
const READY_FALLBACK_MS = 8000

/**
 * App-wide onboarding host. Mounted once at the App root (beside the
 * multi-tab / cookie notices). Shows the first-run Welcome dialog after the
 * app is ready, and mounts the lazily-loaded tour runner only while a tour is
 * active.
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
      {activeTour != null ? (
        <Suspense fallback={null}>
          <TourRunner />
        </Suspense>
      ) : null}
    </>
  )
}
