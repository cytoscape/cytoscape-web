import { useContext } from 'react'
import { AppConfigContext } from '../../AppConfigContext'
import { useHcxValidatorStore } from '../../features/HierarchyViewer/store/HcxValidatorStore'
import { isHCX } from '../../features/HierarchyViewer/utils/hierarchyUtil'
import { validateHcx } from '../../features/HierarchyViewer/model/impl/hcxValidators'
import { HcxMetaTag } from '../../features/HierarchyViewer/model/HcxMetaTag'
import { CyNetwork } from '../../models/CyNetworkModel'
import { IdType } from '../../models/IdType'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { MessageSeverity } from '../../models/MessageModel'
import { LayoutEngine } from '../../models/LayoutModel'
import { getDefaultLayout } from '../../models/LayoutModel/impl/layoutSelection'
import { useLayoutStore } from './stores/LayoutStore'
import { useMessageStore } from './stores/MessageStore'
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

  const setValidationResult = useHcxValidatorStore(
    (state) => state.setValidationResult,
  )
  const addMessage = useMessageStore((state) => state.addMessage)

  const layoutEngines = useLayoutStore((state) => state.layoutEngines)
  const setIsRunning = useLayoutStore((state) => state.setIsRunning)
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
      networkViews,
      visualStyleOptions,
      otherAspects,
      undoRedoStack,
    } = cyNetwork

    setVisualStyleOptions(networkId, visualStyleOptions)
    addNewNetwork(network)
    addVisualStyle(networkId, visualStyle)
    addTable(networkId, nodeTable, edgeTable)
    addViewModel(networkId, networkViews[0])
    if (otherAspects !== undefined) {
      addAllOpaqueAspects(networkId, otherAspects)
    }
    if (undoRedoStack !== undefined) {
      addStack(networkId, undoRedoStack)
    }

    // Validate HCX networks if applicable
    if (isHCX(summary)) {
      const hcxVersion =
        summary.properties.find(
          (p) => p.predicateString === HcxMetaTag.ndexSchema,
        )?.value ?? ''
      const validationResult = validateHcx(
        hcxVersion as string,
        summary,
        nodeTable,
      )

      if (!validationResult.isValid) {
        const HCX_WARNING_DURATION_MS = 5000
        addMessage({
          message: `This network is not a valid HCX network.  Some features may not work properly.`,
          duration: HCX_WARNING_DURATION_MS,
          severity: MessageSeverity.WARNING,
        })
      }
      setValidationResult(networkId, validationResult)
    }

    // Apply default layout if network doesn't have one
    if (!summary.hasLayout) {
      const totalNetworkElements = network.nodes.length + network.edges.length
      const defaultLayout = getDefaultLayout(
        summary,
        totalNetworkElements,
        maxNetworkElementsThreshold,
      )

      if (defaultLayout !== undefined) {
        const layoutEngine: LayoutEngine | undefined = layoutEngines.find(
          (engine) => engine.name === defaultLayout.engineName,
        )

        if (layoutEngine !== undefined) {
          const summaryWithLayout = { ...summary, hasLayout: true }

          setIsRunning(true)
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

          layoutEngine.apply(
            network.nodes,
            network.edges,
            handleLayoutComplete,
            layoutEngine.algorithms[defaultLayout.algorithmName],
          )
        }
      }
    }
  }

  return registerNetwork
}
