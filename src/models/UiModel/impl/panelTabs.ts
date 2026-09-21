import { AppStatus } from '../../AppModel/AppStatus'
import { ComponentMetadata } from '../../AppModel/ComponentMetadata'
import { ComponentType } from '../../AppModel/ComponentType'
import { CyApp } from '../../AppModel/CyApp'
import { RegisteredAppResource } from '../../AppModel/RegisteredAppResource'
import { IdType } from '../../IdType'
import { Panel } from '../Panel'
import {
  BottomPanelTabId,
  LeftPanelTabId,
  PanelTab,
  RightPanelTabId,
} from '../PanelTab'

/** Selection key of a right-pane app tab: the `(appId, slot, id)` triple. */
export const rightPanelResourceId = (appId: string, id: string): string =>
  `${appId}::right-panel::${id}`

/** Selection key of the built-in Sub Network Viewer tab. */
export const BUILTIN_SUB_NETWORK_RESOURCE_ID =
  '__builtin__::right-panel::sub-network-viewer'

/**
 * An app tab shown in the right pane, from either source. Exactly one of
 * `resource` (runtime registration) and `manifest` (`CyApp.components`) is set.
 */
export interface RightPanelAppTab {
  readonly resourceId: string
  readonly appId: string
  readonly id: string
  readonly resource?: RegisteredAppResource
  readonly manifest?: ComponentMetadata
}

/**
 * The left pane's tabs, in strip order. `hasLlmQueryTab` is the caller's
 * call (the tab exists only for a hierarchy network) — models do not know
 * what a hierarchy is.
 */
export const listLeftPanelTabs = (hasLlmQueryTab: boolean): PanelTab[] => {
  const tabs: PanelTab[] = [
    { panel: Panel.LEFT, tabId: LeftPanelTabId.WORKSPACE, index: 0 },
    { panel: Panel.LEFT, tabId: LeftPanelTabId.STYLE, index: 1 },
  ]
  if (hasLlmQueryTab) {
    tabs.push({ panel: Panel.LEFT, tabId: LeftPanelTabId.LLM_QUERY, index: 2 })
  }
  return tabs
}

/** The bottom pane's tabs, in strip order. */
export const listBottomPanelTabs = (): PanelTab[] => [
  { panel: Panel.BOTTOM, tabId: BottomPanelTabId.NODES, index: 0 },
  { panel: Panel.BOTTOM, tabId: BottomPanelTabId.EDGES, index: 1 },
  { panel: Panel.BOTTOM, tabId: BottomPanelTabId.NETWORK, index: 2 },
]

/**
 * The app tabs the right pane shows, in strip order: runtime registrations
 * merged with manifest panels, filtered by visibility, sorted by `order`.
 *
 * A runtime registration shadows a manifest panel with the same identity.
 */
export const listRightPanelAppTabs = (
  apps: Record<string, CyApp>,
  resources: readonly RegisteredAppResource[],
  currentNetworkId: IdType,
): RightPanelAppTab[] => {
  const runtimeTabs: RightPanelAppTab[] = resources
    .filter((r) => {
      if (r.slot !== 'right-panel') return false
      if (apps[r.appId]?.status !== AppStatus.Active) return false
      if (r.requires?.network && !currentNetworkId) return false
      return true
    })
    .map((r) => ({
      resourceId: rightPanelResourceId(r.appId, r.id),
      appId: r.appId,
      id: r.id,
      resource: r,
    }))

  const runtimeIds = new Set(runtimeTabs.map((t) => t.resourceId))

  const manifestTabs: RightPanelAppTab[] = []
  Object.keys(apps).forEach((appId) => {
    const app = apps[appId]
    if (app.status !== AppStatus.Active) return
    ;(app.components ?? []).forEach((component) => {
      if (component.type !== ComponentType.Panel) return
      const resourceId = rightPanelResourceId(appId, component.id)
      if (runtimeIds.has(resourceId)) return
      manifestTabs.push({
        resourceId,
        appId,
        id: component.id,
        manifest: component,
      })
    })
  })

  // Ascending `order`, undefined last. The sort is stable, so ties keep
  // registration order and manifest panels stay behind runtime ones.
  const orderOf = (tab: RightPanelAppTab): number =>
    tab.resource?.order ?? Infinity
  return [...runtimeTabs, ...manifestTabs].sort((a, b) => {
    const orderA = orderOf(a)
    const orderB = orderOf(b)
    return orderA === orderB ? 0 : orderA - orderB
  })
}

/** The right pane's tabs, in strip order: the built-in viewer, then apps. */
export const listRightPanelTabs = (
  apps: Record<string, CyApp>,
  resources: readonly RegisteredAppResource[],
  currentNetworkId: IdType,
): PanelTab[] => [
  {
    panel: Panel.RIGHT,
    tabId: RightPanelTabId.SUB_NETWORK_VIEWER,
    resourceId: BUILTIN_SUB_NETWORK_RESOURCE_ID,
  },
  ...listRightPanelAppTabs(apps, resources, currentNetworkId).map(
    (tab): PanelTab => ({
      panel: Panel.RIGHT,
      tabId: tab.id,
      appId: tab.appId,
      resourceId: tab.resourceId,
    }),
  ),
]

/**
 * Pick the tab `tabId` names among one pane's `tabs`. Ids are not unique, so
 * when several match, the caller's own tab wins; otherwise the first in strip
 * order. An anonymous caller (no `callerAppId`) always gets the first.
 */
export const pickPanelTab = (
  tabs: readonly PanelTab[],
  tabId: string,
  callerAppId?: string,
): PanelTab | undefined => {
  const matches = tabs.filter((tab) => tab.tabId === tabId)
  if (callerAppId !== undefined) {
    const own = matches.find((tab) => tab.appId === callerAppId)
    if (own !== undefined) return own
  }
  return matches[0]
}
