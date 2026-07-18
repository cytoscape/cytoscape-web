import { Panel } from '../../../models/UiModel/Panel'
import { TourDef } from './types'

/** Stable id for the flagship onboarding tour. */
export const GETTING_STARTED_TOUR_ID = 'getting-started'

/**
 * The flagship "Getting Started" tour.
 *
 * Every `target` is a `data-testid` (see {@link TourStepDef}). Steps that only
 * exist once a network is loaded are marked `requiresNetwork`; the tour skips
 * missing targets at runtime (see TourRunner) so it flows whether or not a
 * network is on screen, while the CI anchor test still verifies each testid.
 */
export const gettingStartedTour: TourDef = {
  id: GETTING_STARTED_TOUR_ID,
  label: 'Getting Started',
  description: 'A quick guided walkthrough of the main parts of Cytoscape Web.',
  steps: [
    {
      target: 'toolbar',
      title: 'The toolbar',
      content:
        'Every action lives up here — loading data, editing, layouts, analysis, apps, and help. Let’s look at the essentials.',
      placement: 'bottom',
    },
    {
      target: 'toolbar-data-menu-menu-button',
      title: 'Load a network',
      content:
        'Start from the Data menu. “Open Sample Networks” is the fastest way to get a network on screen; you can also import from NDEx or a file.',
      placement: 'bottom',
    },
    {
      target: 'network-browser-panel',
      title: 'Your workspace',
      content:
        'The networks in your workspace are listed here. Switch between them, and use the tabs to reach the workspace, style, and query tools.',
      placement: 'right',
      openPanel: Panel.LEFT,
    },
    {
      target: 'workspace-editor-center-pane',
      title: 'The canvas',
      content:
        'Your network is drawn here. Pan by dragging, zoom with the scroll wheel, and click nodes or edges to select them.',
      placement: 'top',
    },
    {
      target: 'floating-toolbar',
      title: 'Quick network actions',
      content:
        'This floating toolbar has the actions you reach for most while viewing a network.',
      placement: 'left',
      requiresNetwork: true,
    },
    {
      target: 'fit-button',
      title: 'Fit to screen',
      content: 'Recenter and fit the whole network into view.',
      placement: 'left',
      requiresNetwork: true,
    },
    {
      target: 'apply-layout-button',
      title: 'Apply a layout',
      content:
        'Rearrange nodes with an automatic layout to reveal the structure of your network.',
      placement: 'left',
      requiresNetwork: true,
    },
    {
      target: 'table-browser',
      title: 'Node & edge tables',
      content:
        'Inspect and edit the data behind the graph here. Edits to the tables update what you see on the canvas.',
      placement: 'top',
      requiresNetwork: true,
      openPanel: Panel.BOTTOM,
    },
    {
      target: 'network-browser-panel-style-tab',
      title: 'Style your network',
      content:
        'Open the Style tab (the Vizmapper) to map data columns to node and edge appearance — color, size, shape, labels, and more.',
      placement: 'right',
      openPanel: Panel.LEFT,
    },
    {
      target: 'toolbar-help-menu-menu-button',
      title: 'More help anytime',
      content:
        'That’s the tour! Find the full User Manual — and replay this walkthrough with “Take a tour” — under the Help menu whenever you need it.',
      placement: 'bottom',
    },
  ],
}
