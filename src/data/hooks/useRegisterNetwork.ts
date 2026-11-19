import { useContext } from 'react'

import { AppConfigContext } from '../../AppConfigContext'
import { isHCX } from '../../features/HierarchyViewer/utils/hierarchyUtil'
import { validateAndRecordHcx } from '../../features/HierarchyViewer/utils/validateAndRecordHcx'
import { CyNetwork } from '../../models/CyNetworkModel'
import { IdType } from '../../models/IdType'
import { getDefaultLayout } from '../../models/LayoutModel/impl/layoutSelection'
import {
  runEngineLayout,
  type RunEngineLayoutParams,
} from '../../models/LayoutModel/impl/runEngineLayout'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { useLayoutStore } from './stores/LayoutStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useRendererFunctionStore } from './stores/RendererFunctionStore'
import { runInitialLayoutWhenIdle } from './stores/runLayoutWhenIdle'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useUndoStore } from './stores/UndoStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'

/** Schedule the size-based initial layout for a newly registered or reloaded network. */
export const applyInitialLayout = (
  networkId: IdType,
  summary: NetworkSummary,
  maxNetworkElementsThreshold: number,
  afterLayout: RunEngineLayoutParams['afterLayout'],
): void => {
  if (summary.hasLayout) return

  runInitialLayoutWhenIdle(networkId, (network, claim) => {
    const currentSummary =
      useNetworkSummaryStore.getState().summaries[networkId] ?? summary
    const layout = getDefaultLayout(
      network.nodes.length + network.edges.length,
      maxNetworkElementsThreshold,
      isHCX(currentSummary),
    )
    // Finishing a skipped turn lets the next waiting network take the slot.
    if (layout === undefined) return true

    const { layoutEngines, setIsRunning } = useLayoutStore.getState()
    const engine = layoutEngines.find(
      (engine) => engine.name === layout.engineName,
    )
    const algorithm = engine?.algorithms[layout.algorithmName]
    if (engine === undefined || algorithm === undefined) return true

    return runEngineLayout({
      engine,
      algorithm,
      network,
      networkId,
      afterLayout,
      startLayout: claim,
      setIsRunning,
    })
  })
}

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

    applyInitialLayout(
      networkId,
      summary,
      maxNetworkElementsThreshold,
      (positionMap) => {
        // Snapshot first, as createLayoutCompletionHandler does: an edit
        // made while this layout waited or ran keeps its modified flag,
        // so Save Workspace still uploads the network.
        const modifiedMeanwhile =
          useWorkspaceStore.getState().workspace.networkModified[networkId] ===
          true
        updateNodePositions(networkId, positionMap)
        const fitFunction = getFunction('cyjs', 'fit', networkId)

        // Fit the viewport to center the initial layout
        if (fitFunction !== undefined) {
          fitFunction()
        }

        // Only the layout field: a whole registration-time summary would
        // overwrite a rename made meanwhile
        updateSummary(networkId, { hasLayout: true })
        setIsRunning(false)
        if (!modifiedMeanwhile) {
          setNetworkModified(networkId, false)
        }
      },
    )
  }

  return registerNetwork
}
