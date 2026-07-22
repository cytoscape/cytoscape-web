import difference from 'lodash/difference'
import { useEffect, useState } from 'react'

import {
  deleteNetworkFromDb,
  deleteNetworkViewsFromDb,
  deleteTablesFromDb,
  deleteVisualStyleFromDb,
  getAllNetworkKeys,
} from '../../../data/db'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { logDb } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { NetworkSummary } from '../../../models/NetworkSummaryModel'
import { DEFAULT_RENDERER_ID } from '../../../models/RendererModel/impl/defaultRenderer'
import { Panel } from '../../../models/UiModel/Panel'
import { PanelState } from '../../../models/UiModel/PanelState'
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

  useEffect(() => {
    if (summary === undefined) {
      return
    }

    // Use the shared HCX detection, which treats a network with no properties
    // (or no HCX metadata) as a non-hierarchy. Previously an empty-properties
    // early return skipped the teardown below, so opening a regular network
    // from NDEx after a hierarchy left the Cell View renderer — and its
    // Tree View / Cell View tabs — in place (CW-466).
    if (isHCX(summary)) {
      // Enable popup = this is a HCX
      enablePopup(true)
    } else {
      enablePopup(false)
      // Delete the Cell View (circle packing) renderer if it exists, so the
      // hierarchy tabs disappear for regular networks.
      const cellViewRenderer = renderers.circlePacking
      if (cellViewRenderer !== undefined) {
        deleteRenderer(cellViewRenderer.id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on summary change; renderers are fresh at trigger time
  }, [summary])

  useEffect(() => {
    const showPanel: boolean = uiState.enablePopup
    if (showPanel) {
      setPanelState(Panel.RIGHT, PanelState.OPEN)
    } else {
      setPanelState(Panel.RIGHT, PanelState.CLOSED)
    }
  }, [uiState.enablePopup, setPanelState])
}
