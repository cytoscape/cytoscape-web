import { lazy, ReactElement, Suspense, useEffect, useState } from 'react'

import { useBootState } from '../../boot/shell/useBootState'
import { isWorkspaceHydrated } from '../../boot/workspaceHydrated'
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

/** Event dispatched by `publishWorkspace` once the workspace is in the stores. */
const APP_READY_EVENT = 'cywebapi:ready'

/**
 * App-wide onboarding host. Mounted once inside the App's error boundary (beside
 * the cookie notice). Shows the first-run Welcome dialog after the app is ready,
 * and mounts the lazily-loaded tour runner only while a tour is active.
 *
 * Readiness is read two ways on purpose. `isWorkspaceHydrated()` covers the case
 * where `publishWorkspace` already ran before this mounted — the event is a
 * one-shot and is gone by then — and the listener covers the usual ordering.
 * There is deliberately NO timeout fallback: the previous 8s timer could not
 * distinguish "the event already fired" from "the boot died", so a failed boot
 * got a welcome dialog on top of its error screen.
 */
export const OnboardingHost = (): ReactElement => {
  const hasSeenWelcome = useOnboardingStore((state) => state.hasSeenWelcome)
  const activeTour = useOnboardingStore((state) => state.activeTour)
  const startTour = useOnboardingStore((state) => state.startTour)
  const markWelcomeSeen = useOnboardingStore((state) => state.markWelcomeSeen)

  // Terminal boot failures are surfaced by the boot shell; onboarding an app
  // that never opened is worse than not onboarding at all.
  const { error: bootError } = useBootState()

  const [appReady, setAppReady] = useState(isWorkspaceHydrated)

  useEffect(() => {
    if (hasSeenWelcome || appReady) {
      // Nothing to wait for — already onboarded, or hydration already observed.
      return
    }

    const onReady = (): void => {
      logUi.info('App ready — enabling first-run onboarding')
      setAppReady(true)
    }

    window.addEventListener(APP_READY_EVENT, onReady, { once: true })

    return () => {
      window.removeEventListener(APP_READY_EVENT, onReady)
    }
  }, [hasSeenWelcome, appReady])

  const showWelcome =
    appReady && bootError === undefined && !hasSeenWelcome && activeTour == null

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
