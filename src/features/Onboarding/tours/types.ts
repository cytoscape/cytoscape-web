import type { Placement } from 'react-joyride'

import { Panel } from '../../../models/UiModel/Panel'

/**
 * A single tour step.
 *
 * `target` is ALWAYS a `data-testid` value (not a full CSS selector). This is
 * deliberate: it keeps steps anchored to the app's stable testid surface and
 * lets the CI anchor test (test/playwright/onboarding-tour-anchors.spec.ts)
 * verify every target still exists, so tours cannot silently go stale.
 *
 * Steps are pure data (no imported side effects) so the registry can be safely
 * imported by the Playwright anchor test. Behavior like opening a panel is
 * declared via {@link TourStepDef.openPanel} and applied by the TourRunner.
 */
export interface TourStepDef {
  /** The `data-testid` of the element to spotlight. */
  target: string
  title: string
  /** Body copy. */
  content: string
  placement?: Placement | 'auto' | 'center'
  /**
   * True if this step's target only exists once a network is loaded
   * (renderer, floating toolbar, table/style contents). The anchor test
   * verifies these via source presence rather than empty-workspace DOM.
   */
  requiresNetwork?: boolean
  /**
   * Open this panel before the step is shown, so its target is mounted.
   * Applied by the TourRunner via the UiStateStore panel actions.
   */
  openPanel?: Panel
}

export interface TourDef {
  /** Stable id used for completion tracking and relaunch. */
  id: string
  /** Human-readable label (Help menu, tour picker). */
  label: string
  /** One-line description of what the tour covers. */
  description: string
  steps: TourStepDef[]
}

/** Build the CSS selector react-joyride expects from a step's testid target. */
export const stepSelector = (step: TourStepDef): string =>
  `[data-testid="${step.target}"]`
