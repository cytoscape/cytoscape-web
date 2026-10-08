// src/app-api/core/panelApi.ts
//
// Panel API: open one of the workspace's collapsible panes and select a tab
// inside it. `panelApi` is the anonymous instance on window.CyWebApi;
// `createPanelApi(appId)` is the per-app one on AppContext.apis, which knows
// the caller and so can prefer its own tab when ids collide.
// Design: docs/design/module-federation/specifications/panel-api-design.md

import { useAppResourceStore } from '../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useSidePanelStore } from '../../data/hooks/stores/SidePanelStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
// A pure predicate, not a component: the one thing this file needs from
// features/, because only the hierarchy viewer knows what makes a network HCX.
import { isHCX } from '../../features/HierarchyViewer/utils/hierarchyUtil'
import {
  listBottomPanelTabs,
  listLeftPanelTabs,
  listRightPanelTabs,
  pickPanelTab,
} from '../../models/UiModel/impl/panelTabs'
import { Panel } from '../../models/UiModel/Panel'
import { PanelState } from '../../models/UiModel/PanelState'
import type { PanelTab } from '../../models/UiModel/PanelTab'
import type { ApiResult } from '../types/ApiResult'
import { AppCodes, fail, ok } from '../types/ApiResult'
import type { OpenPanelResult, PanelApi, PanelId } from '../types/PanelTypes'

const PANELS: readonly string[] = [Panel.LEFT, Panel.RIGHT, Panel.BOTTOM]

/** The tabs `panel` shows right now, in strip order. */
const listPanelTabs = (panel: PanelId): PanelTab[] => {
  const { currentNetworkId } = useWorkspaceStore.getState().workspace
  if (panel === Panel.LEFT) {
    const summary =
      useNetworkSummaryStore.getState().summaries[currentNetworkId]
    return listLeftPanelTabs(isHCX(summary))
  }
  if (panel === Panel.BOTTOM) {
    return listBottomPanelTabs()
  }
  return listRightPanelTabs(
    useAppStore.getState().apps,
    useAppResourceStore.getState().resources,
    currentNetworkId,
  )
}

/**
 * Select `tab` the way a click on it does — and no more: clicking the Sub
 * Network Viewer tab also activates a network view, a side effect a request
 * to show the tab should not have.
 */
const selectTab = (tab: PanelTab): void => {
  if (tab.panel === Panel.RIGHT) {
    useSidePanelStore.getState().setSelectedTabId(tab.resourceId ?? null)
  } else if (tab.index !== undefined) {
    const ui = useUiStateStore.getState()
    if (tab.panel === Panel.LEFT) {
      ui.setActiveNetworkBrowserPanelIndex(tab.index)
    } else {
      ui.setActiveTableBrowserIndex(tab.index)
    }
  }
}

/**
 * Create a PanelApi. `appId` is the calling app, used only to break a tie
 * between tabs of one pane that share an id; omit it for an anonymous caller.
 */
export const createPanelApi = (appId?: string): PanelApi => ({
  open(panel: PanelId, tabId?: string): ApiResult<OpenPanelResult> {
    try {
      // typeof guards first: arguments can arrive from untyped JS callers.
      if (typeof panel !== 'string' || !PANELS.includes(panel)) {
        return fail(
          AppCodes.INVALID_INPUT,
          "panel must be one of 'left' | 'right' | 'bottom'",
        )
      }
      if (
        tabId !== undefined &&
        (typeof tabId !== 'string' || tabId.trim() === '')
      ) {
        return fail(AppCodes.INVALID_INPUT, 'tabId must be a non-empty string')
      }

      // Resolve before touching anything: an unknown tab must not open the
      // pane onto whatever happened to be selected.
      let tab: PanelTab | undefined
      if (tabId !== undefined) {
        tab = pickPanelTab(listPanelTabs(panel), tabId, appId)
        if (tab === undefined) {
          return fail(
            AppCodes.RESOURCE_NOT_FOUND,
            `Tab '${tabId}' in the ${panel} panel`,
          )
        }
        selectTab(tab)
      }

      useUiStateStore.getState().setPanelState(panel, PanelState.OPEN)

      return ok({
        panel,
        ...(tab !== undefined && { tabId: tab.tabId }),
        ...(tab?.appId !== undefined && { appId: tab.appId }),
      })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },
})

/** The anonymous instance, exposed as `window.CyWebApi.panel`. */
export const panelApi: PanelApi = createPanelApi()
