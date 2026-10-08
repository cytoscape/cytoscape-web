import { Panel } from './Panel'

/**
 * Public ids of the built-in tabs in the workspace's collapsible panes.
 *
 * They are part of the App API contract (`panel.open(panel, tabId)`), so treat
 * a rename as a breaking change. The pane scopes an id: the same string may
 * appear in two panes.
 */
export const LeftPanelTabId = {
  WORKSPACE: 'workspace',
  STYLE: 'style',
  /** Only present while the current network is a hierarchy (HCX). */
  LLM_QUERY: 'llm-query',
} as const

export const BottomPanelTabId = {
  NODES: 'nodes',
  EDGES: 'edges',
  NETWORK: 'network',
} as const

export const RightPanelTabId = {
  SUB_NETWORK_VIEWER: 'sub-network-viewer',
} as const

/**
 * A tab that is currently shown in one of the collapsible panes.
 *
 * The left and bottom panes select by position (`index`); the right pane
 * selects by identity (`resourceId`), because app tabs come and go.
 */
export interface PanelTab {
  readonly panel: Panel
  /** The id an app registered the tab with, or a built-in id. */
  readonly tabId: string
  /** The owning app. Absent for built-in tabs. */
  readonly appId?: string
  /** Left and bottom panes: position in the tab strip. */
  readonly index?: number
  /** Right pane: the selection key used by the side panel. */
  readonly resourceId?: string
}
