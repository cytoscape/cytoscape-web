import { useContext } from 'react'

import { AppConfigContext } from '../../AppConfigContext'
import { isHCX } from '../../features/HierarchyViewer/utils/hierarchyUtil'
import { validateAndRecordHcx } from '../../features/HierarchyViewer/utils/validateAndRecordHcx'
import { CyNetwork } from '../../models/CyNetworkModel'
import { IdType } from '../../models/IdType'
import { LayoutEngine } from '../../models/LayoutModel'
import { getDefaultLayout } from '../../models/LayoutModel/impl/layoutSelection'
import { runEngineLayout } from '../../models/LayoutModel/impl/runEngineLayout'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { useLayoutStore } from './stores/LayoutStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useRendererFunctionStore } from './stores/RendererFunctionStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useUndoStore } from './stores/UndoStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'

export const useRegisterNetwork = () => {
  const { maxNetworkElementsThreshold } = useContext(AppConfigContext)

  const addNewNetwork = useNetworkStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const addAllOpaqueAspects = useOpaqueAspectStore((state) => state.addAll)
  const addStack = useUndoStore((state) => state.addStack)
  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )
  const setNetworkModified = useWorkspaceStore(
    (state) => state.setNetworkModified,
  )

  const layoutEngines = useLayoutStore((state) => state.layoutEngines)
  const setIsRunning = useLayoutStore((state) => state.setIsRunning)
  const addSummary = useNetworkSummaryStore((state) => state.add)
  const updateSummary = useNetworkSummaryStore((state) => state.update)
  const updateNodePositions = useViewModelStore(
    (state) => state.updateNodePositions,
  )
  const getFunction = useRendererFunctionStore((state) => state.getFunction)

  const registerNetwork = (
    networkId: IdType,
    cyNetwork: CyNetwork,
    summary: NetworkSummary,
  ) => {
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
    } = cyNetwork

    setVisualStyleOptions(networkId, visualStyleOptions)
    addNewNetwork(network)
    addVisualStyle(networkId, visualStyle, visualStyleSet)
    addTable(networkId, nodeTable, edgeTable)
    addViewModel(networkId, networkViews[0])
    addSummary(networkId, summary)
    if (otherAspects !== undefined) {
      addAllOpaqueAspects(networkId, otherAspects)
    }
    if (undoRedoStack !== undefined) {
      addStack(networkId, undoRedoStack)
    }

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

          const handleLayoutComplete = (
            positionMap: Map<IdType, [number, number]>,
          ): void => {
            updateNodePositions(networkId, positionMap)
            const fitFunction = getFunction('cyjs', 'fit', networkId)

            // Fit the viewport to center the initial layout
            if (fitFunction !== undefined) {
              fitFunction()
            }

            updateSummary(networkId, summaryWithLayout)
            setIsRunning(false)
            setNetworkModified(networkId, false)
          }

          // The shared runner: a synchronous throw or a rejected promise
          // from `apply` is logged and resets `isRunning`, instead of
          // leaving the running flag stuck for the session.
          runEngineLayout({
            engine: layoutEngine,
            algorithm: layoutEngine.algorithms[defaultLayout.algorithmName],
            network,
            networkId,
            afterLayout: handleLayoutComplete,
            setIsRunning,
          })
        }
      }
    }
  }

  return registerNetwork
}
