import { useTheme } from '@mui/material/styles'
import { ReactElement, useMemo } from 'react'
import { EventData, EVENTS, Joyride, STATUS, Step } from 'react-joyride'

import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../debug'
import { useOnboardingStore } from './store/OnboardingStore'
import { getTour } from './tours/registry'
import { stepSelector, TourStepDef } from './tours/types'
import { visibleSteps } from './tours/visibleSteps'
import { openPanel, waitForPanel } from './utils/tourActions'

/**
 * Renders the active onboarding tour with react-joyride.
 *
 * Reads `activeTour` from the OnboardingStore. Each tour step is anchored to a
 * `data-testid`; steps whose targets only exist with a network loaded are
 * skipped gracefully at runtime, so the tour flows regardless of app state.
 */
export const TourRunner = (): ReactElement | null => {
  const theme = useTheme()
  const activeTour = useOnboardingStore((state) => state.activeTour)
  const completeTour = useOnboardingStore((state) => state.completeTour)
  const stopTour = useOnboardingStore((state) => state.stopTour)

  const tour = getTour(activeTour)

  // Network-only steps are filtered out rather than left to self-skip; see
  // visibleSteps for why joyride's TARGET_NOT_FOUND is not enough on its own.
  const hasNetwork = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId !== '',
  )

  const steps = useMemo<Step[]>(() => {
    if (tour == null) {
      return []
    }
    return visibleSteps(tour.steps, hasNetwork).map((step: TourStepDef) => ({
      target: stepSelector(step),
      title: step.title,
      // Wrapped so tests can assert on a specific step without matching its
      // prose. Targets are unique within a tour, so they make stable ids.
      content: (
        <span data-testid={`tour-step-${step.target}`}>{step.content}</span>
      ),
      placement: step.placement ?? 'auto',
      targetWaitTimeout: 2000,
      before:
        step.openPanel != null
          ? async () => {
              openPanel(step.openPanel!)
              await waitForPanel()
            }
          : undefined,
    }))
  }, [tour, hasNetwork])

  if (tour == null) {
    return null
  }

  const handleEvent = (data: EventData): void => {
    const { type, status } = data

    // Joyride already advances the index itself when a target is missing (and
    // decrements it when the user was going back), so this only logs. Calling
    // controls.next() here advanced a second time and silently ate the
    // following step.
    if (type === EVENTS.TARGET_NOT_FOUND) {
      logUi.info('Tour target not found, skipping step', data.step?.target)
      return
    }

    if (type === EVENTS.TOUR_END) {
      if (status === STATUS.FINISHED) {
        completeTour(tour.id)
      } else {
        stopTour()
      }
    }
  }

  return (
    <Joyride
      key={tour.id}
      steps={steps}
      run
      continuous
      onEvent={handleEvent}
      options={{
        skipBeacon: true,
        buttons: ['back', 'skip', 'primary'],
        zIndex: theme.zIndex.tooltip + 100,
        primaryColor: theme.palette.primary.main,
        overlayColor: 'rgba(0, 0, 0, 0.55)',
      }}
      styles={{
        tooltip: {
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderRadius: theme.shape.borderRadius as number,
        },
        tooltipTitle: { color: theme.palette.text.primary },
        tooltipContent: { color: theme.palette.text.secondary },
      }}
      locale={{
        last: 'Done',
        skip: 'Skip tour',
      }}
    />
  )
}
