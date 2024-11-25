import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import {
  NdexNetworkProperty,
  NdexNetworkSummary,
} from '../../../models/NetworkSummaryModel'
import { IdType } from '../../../models/IdType'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import { PanelState } from '../../../models/UiModel/PanelState'
import { Panel } from '../../../models/UiModel/Panel'
import { ValueType } from '../../../models/TableModel'
import { HcxMetaData } from '../model/HcxMetaData'
import { getHcxProps } from '../utils/hierarchy-util'
import _ from 'lodash'
import {
  deleteNetworkFromDb,
  deleteNetworkViewsFromDb,
  deleteTablesFromDb,
  deleteVisualStyleFromDb,
  getAllNetworkKeys,
} from '../../../store/persist/db'
import { useRendererStore } from '../../../store/RendererStore'
import { DEFAULT_RENDERER_ID } from '../../../store/DefaultRenderer'

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
  }, [])

  const setActiveNetworkView = useUiStateStore(
    (state) => state.setActiveNetworkView,
  )
  const activeNetworkView = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  const deleteRenderer = useRendererStore((state) => state.delete)
  const renderers = useRendererStore((state) => state.renderers)

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
    const diff = _.difference(lastIds, networkIds)
    setLastIds(networkIds)

    if (diff.length < 1) {
      return
    }

    const removed = diff[0]

    void deleteChildren(removed).catch((error) => {
      console.error('## Error deleting interaction networks:', error)
    })
  }, [networkIds])

  const uiState = useUiStateStore((state) => state.ui)
  const setPanelState = useUiStateStore((state) => state.setPanelState)

  const summaries: Record<IdType, NdexNetworkSummary> = useNetworkSummaryStore(
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

    const networkProps: NdexNetworkProperty[] = summary.properties
    const networkPropObj: Record<string, ValueType> = networkProps.reduce<{
      [key: string]: ValueType
    }>((acc, prop) => {
      acc[prop.predicateString] = prop.value
      return acc
    }, {})
    if (Object.keys(networkPropObj).length === 0) {
      enablePopup(false)
      return
    }
    const metadata: HcxMetaData | undefined = getHcxProps(networkPropObj)
    if (metadata !== undefined) {
      // Enable popup = this is a HCX
      enablePopup(true)
    } else {
      enablePopup(false)
      // Delete the CP renderer if it exists
      if (renderers.circlePacking !== undefined) {
        deleteRenderer(renderers.circlePacking.id)
      }
    }
  }, [summary])

  useEffect(() => {
    const showPanel: boolean = uiState.enablePopup
    if (showPanel) {
      setPanelState(Panel.RIGHT, PanelState.OPEN)
    } else {
      setPanelState(Panel.RIGHT, PanelState.CLOSED)
    }
  }, [uiState.enablePopup])
}
