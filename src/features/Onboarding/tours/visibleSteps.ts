import { TourStepDef } from './types'

/**
 * The steps a tour should actually present, given whether a network is on
 * screen.
 *
 * `requiresNetwork` steps are dropped outright when the workspace has no
 * current network. This has to be an explicit check rather than a side effect
 * of joyride's TARGET_NOT_FOUND handling: joyride skips a step only when its
 * target is missing from the DOM, and several network-only targets are mounted
 * whether or not a network is loaded — `workspace-editor-center-pane` is an
 * unconditional Allotment.Pane in WorkspaceEditor, and `table-browser` sits on
 * TableBrowser's root Box. Those two therefore never self-skipped, so a
 * first-run user with an empty workspace was told their network was drawn on
 * the canvas and that the table held the data behind the graph.
 */
export const visibleSteps = (
  steps: TourStepDef[],
  hasNetwork: boolean,
): TourStepDef[] =>
  hasNetwork ? steps : steps.filter((step) => step.requiresNetwork !== true)
