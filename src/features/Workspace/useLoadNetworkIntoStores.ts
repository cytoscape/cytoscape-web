import { useContext } from 'react'

import { AppConfigContext } from '../../AppConfigContext'
import { useLayoutStore } from '../../data/hooks/stores/LayoutStore'
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../data/hooks/stores/OpaqueAspectStore'
import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useUndoStore } from '../../data/hooks/stores/UndoStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { useLoadCyNetwork } from '../../data/hooks/useLoadCyNetwork'
import { useLoadNetworkSummaries } from '../../data/hooks/useLoadNetworkSummaries'
import { CyNetwork } from '../../models'
import { IdType } from '../../models/IdType'
import { LayoutEngine } from '../../models/LayoutModel'
import { getDefaultLayout } from '../../models/LayoutModel/impl/layoutSelection'
import { isHCX } from '../HierarchyViewer/utils/hierarchyUtil'
import { validateAndRecordHcx } from '../HierarchyViewer/utils/validateAndRecordHcx'
import { createLayoutCompletionHandler } from './layoutCompletion'

/**
 * Returns a function that loads a network by ID and fills every store that
 * draws it: network data, visual styles, tables, views, opaque aspects and the
 * undo stack. It validates HCX networks and runs the default layout on a
 * network without one.
 *
 * Shared by the editor (WorkspaceEditor) and the embed (EmbedViewer), so both
 * show a network the same way.
 *
 * The returned function resolves true when the network loaded, and false when
 * `isRemoved` turned true while it loaded: its data is then discarded rather
 * than put back in the stores. It rejects on any load failure.
 */
export const useLoadNetworkIntoStores = (): ((
  networkId: IdType,
  isRemoved: () => boolean,
) => Promise<boolean>) => {
  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )
  const setNetworkModified: (id: IdType, isModified: boolean) => void =
    useWorkspaceStore((state) => state.setNetworkModified)
  const addStack = useUndoStore((state) => state.addStack)

  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )
  const setIsRunning: (isRunning: boolean) => void = useLayoutStore(
    (state) => state.setIsRunning,
  )

  const updateSummary = useNetworkSummaryStore((state) => state.update)

  const loadCyNetwork = useLoadCyNetwork()
  const loadNetworkSummaries = useLoadNetworkSummaries()

  const addNewNetwork = useNetworkStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const addAllOpaqueAspects = useOpaqueAspectStore((state) => state.addAll)
  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  const getFunction = useRendererFunctionStore((state) => state.getFunction)

  const { maxNetworkElementsThreshold } = useContext(AppConfigContext)

  return async (networkId, isRemoved) => {
    // Cached summaries/content resolve immediately; the loaders only wait
    // for the auth token when they actually fetch from NDEx (cache miss).
    const summaryMap = await loadNetworkSummaries([networkId])
    const summary = summaryMap[networkId]
    const cyNetworkData: CyNetwork = await loadCyNetwork(networkId)
    // Deleted while it loaded: adding it now would bring it back
    if (isRemoved()) {
      return false
    }
    const {
      network,
      nodeTable,
      edgeTable,
      visualStyle,
      visualStyleSet,
      networkViews,
      visualStyleOptions,
      otherAspects,
      undoRedoStack,
    } = cyNetworkData

    setVisualStyleOptions(networkId, visualStyleOptions)
    addNewNetwork(network)
    addVisualStyle(networkId, visualStyle, visualStyleSet)
    addTable(networkId, nodeTable, edgeTable)
    addViewModel(networkId, networkViews[0])
    if (otherAspects !== undefined) {
      addAllOpaqueAspects(networkId, otherAspects)
    }
    addStack(networkId, undoRedoStack)

    // Validate HCX networks if applicable
    if (isHCX(summary)) {
      validateAndRecordHcx(networkId, summary, nodeTable, edgeTable)
    }

    // Apply default layout if network doesn't have one
    if (!summary.hasLayout) {
      const totalNetworkElements = network.nodes.length + network.edges.length
      const defaultLayout = getDefaultLayout(
        totalNetworkElements,
        maxNetworkElementsThreshold,
        isHCX(summary),
      )

      if (defaultLayout !== undefined) {
        const layoutEngine: LayoutEngine | undefined = layoutEngines.find(
          (engine) => engine.name === defaultLayout.engineName,
        )

        if (layoutEngine !== undefined) {
          const summaryWithLayout = { ...summary, hasLayout: true }

          setIsRunning(true)
          const handleLayoutComplete = createLayoutCompletionHandler(
            networkId,
            {
              // Read from the store directly to get the value current at
              // callback time rather than the stale closure value.
              isNetworkModified: (id) =>
                useWorkspaceStore.getState().workspace.networkModified[id] ===
                true,
              updateNodePositions,
              fitViewport: (id) => {
                const fitFunction = getFunction('cyjs', 'fit', id)
                if (fitFunction !== undefined) {
                  fitFunction()
                }
              },
              markLayoutApplied: (id) => updateSummary(id, summaryWithLayout),
              setLayoutRunning: setIsRunning,
              setNetworkModified,
            },
          )

          layoutEngine.apply(
            network.nodes,
            network.edges,
            handleLayoutComplete,
            layoutEngine.algorithms[defaultLayout.algorithmName],
            networkId,
          )
        }
      }
    }
    return true
  }
}
