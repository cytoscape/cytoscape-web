import difference from 'lodash/difference'
import { useEffect, useRef, useState } from 'react'

import {
  deleteNetworkFromDb,
  deleteNetworkViewsFromDb,
  deleteTablesFromDb,
  deleteVisualStyleFromDb,
  getAllNetworkKeys,
} from '../../../data/db'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useSidePanelStore } from '../../../data/hooks/stores/SidePanelStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { logDb, logUi } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { NetworkSummary } from '../../../models/NetworkSummaryModel'
import { DEFAULT_RENDERER_ID } from '../../../models/RendererModel/impl/defaultRenderer'
import { BUILTIN_SUB_NETWORK_RESOURCE_ID } from '../../../models/UiModel/impl/panelTabs'
import { Panel } from '../../../models/UiModel/Panel'
import { PanelState } from '../../../models/UiModel/PanelState'
import { Table } from '../../../models/TableModel'
import {
  CirclePackingRenderer,
  CP_RENDERER_ID,
} from '../components/CirclePackingLayout/CirclePackingRenderer'
import {
  hasUniformEdgeInteraction,
  MIXED_INTERACTION_WARNING,
} from '../model/impl/circlePackingSupport'
import { isHCX } from '../utils/hierarchyUtil'

/**
 *  Switch the panel state based on the network meta data
 */
export const useHierarchyViewerManager = (): void => {
  // Keep track of last network list and check the diff
  const [lastIds, setLastIds] = useState<IdType[]>([])

  // For watching deletion of networks in the workspace
  const networkIds: IdType[] = useWorkspaceStore(
    (state) => state.workspace.networkIds,
  )

  // For managing tab name for HCX
  const setCustomNetworkTabName = useUiStateStore(
    (state) => state.setCustomNetworkTabName,
  )

  useEffect(() => {
    setCustomNetworkTabName(DEFAULT_RENDERER_ID, 'Tree View')
    // clear the name when the component is unmounted
    return () => {
      setCustomNetworkTabName(DEFAULT_RENDERER_ID, '')
    }
  }, [setCustomNetworkTabName])

  const setActiveNetworkView = useUiStateStore(
    (state) => state.setActiveNetworkView,
  )
  const activeNetworkView = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  const addRenderer = useRendererStore((state) => state.add)
  const deleteRenderer = useRendererStore((state) => state.delete)
  const renderers = useRendererStore((state) => state.renderers)

  // Detects removed hierarchy networks by diffing networkIds against the
  // lastIds snapshot. lastIds is only ever written here, so it is intentionally
  // not a dependency — networkIds is the sole trigger.
  useEffect(() => {
    const deleteChildren = async (parentId: IdType): Promise<void> => {
      const keys = await getAllNetworkKeys()

      for (let i = 0; i < keys.length; i++) {
        const key: IdType = keys[i]

        if (key === activeNetworkView) {
          setActiveNetworkView('')
        }

        if (key.startsWith(parentId)) {
          await deleteNetworkFromDb(key)
          await deleteNetworkViewsFromDb(key)
          await deleteVisualStyleFromDb(key)
          await deleteTablesFromDb(key)
        }
      }
    }

    if (lastIds.length === 0 && networkIds.length === 0) {
      return
    }

    // Check the diff
    const diff = difference(lastIds, networkIds)
    setLastIds(networkIds)

    if (diff.length < 1) {
      return
    }

    const removed = diff[0]

    void deleteChildren(removed).catch((error) => {
      logDb.error(
        `[${useHierarchyViewerManager.name}]: Error deleting interaction networks:`,
        error,
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on networkIds; lastIds is the previous-value snapshot
  }, [networkIds])

  const uiState = useUiStateStore((state) => state.ui)
  const setPanelState = useUiStateStore((state) => state.setPanelState)

  const summaries: Record<IdType, NetworkSummary> = useNetworkSummaryStore(
    (state) => state.summaries,
  )
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const enablePopup: (enable: boolean) => void = useUiStateStore(
    (state) => state.enablePopup,
  )

  const summary = summaries[currentNetworkId]
  const edgeTable: Table | undefined = useTableStore(
    (state) => state.tables[currentNetworkId]?.edgeTable,
  )
  const hasCellViewRenderer: boolean = renderers[CP_RENDERER_ID] !== undefined

  useEffect(() => {
    if (summary === undefined) {
      return
    }
    // Enable popup = this is a HCX
    enablePopup(isHCX(summary))
  }, [summary, enablePopup])

  // The Cell View renderer, and with it the Tree View / Cell View tabs, exists
  // while the current network is a hierarchy it can draw. This lives here and
  // not in the Sub Network Viewer because that viewer is unmounted while an app
  // tab is selected in the right panel, so a hierarchy came back without its
  // tabs (#946).
  //
  // Uses the shared HCX detection, which treats a network with no properties
  // (or no HCX metadata) as a non-hierarchy. Previously an empty-properties
  // early return skipped the removal, so opening a regular network from NDEx
  // after a hierarchy left the tabs in place (CW-466).
  useEffect(() => {
    if (summary === undefined) {
      return
    }

    let canDraw: boolean = false
    if (isHCX(summary)) {
      if (edgeTable === undefined) {
        // Tables have not been loaded yet: decide nothing. This effect re-runs
        // when the table arrives.
        return
      }
      // A hierarchy with non parent-child edges, which the circle packing
      // layout cannot interpret, drops the Cell View tab instead of rendering a
      // wrong or empty diagram (#630).
      canDraw = hasUniformEdgeInteraction(edgeTable)
      if (!canDraw) {
        logUi.info(
          `[${useHierarchyViewerManager.name}]: ${MIXED_INTERACTION_WARNING}`,
          currentNetworkId,
        )
      }
    }

    if (canDraw && !hasCellViewRenderer) {
      addRenderer(CirclePackingRenderer)
    } else if (!canDraw && hasCellViewRenderer) {
      deleteRenderer(CP_RENDERER_ID)
    }
  }, [
    summary,
    edgeTable,
    currentNetworkId,
    hasCellViewRenderer,
    addRenderer,
    deleteRenderer,
  ])

  // The right panel follows `enablePopup` only when it changes: switching to
  // a hierarchy opens the panel, switching away from one closes it. The value
  // it mounts with is not a change. Acting on it closed the panel on every
  // boot with a regular network (`enablePopup` starts false), undoing
  // `?right=open` and a restored open panel some time after boot had opened
  // it — a race e2e specs that need the panel kept losing.
  //
  // Leaving a hierarchy closes the panel only while the Sub Network Viewer is
  // the selected tab (or none was chosen yet, which shows the viewer): it is
  // the tab that goes away. An app tab the user picked is still there on the
  // next network, so closing the panel would only make them reopen it (#881).
  const lastEnablePopupRef = useRef(uiState.enablePopup)
  useEffect(() => {
    const showPanel: boolean = uiState.enablePopup
    if (showPanel === lastEnablePopupRef.current) {
      return
    }
    lastEnablePopupRef.current = showPanel
    if (showPanel) {
      setPanelState(Panel.RIGHT, PanelState.OPEN)
      return
    }
    const { selectedTabId } = useSidePanelStore.getState()
    if (
      selectedTabId === null ||
      selectedTabId === BUILTIN_SUB_NETWORK_RESOURCE_ID
    ) {
      setPanelState(Panel.RIGHT, PanelState.CLOSED)
    }
  }, [uiState.enablePopup, setPanelState])
}
