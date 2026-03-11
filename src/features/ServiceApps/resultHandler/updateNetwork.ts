import { useCallback } from 'react'

import { logApi, logStore } from '../../../debug'
import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../../data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import {
  DEF_VIEW_TYPE,
  useViewModelStore,
} from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { Cx2 } from '../../../models/CxModel/Cx2'
import { CoreAspectTag } from '../../../models/CxModel/Cx2/CoreAspectTag'
import { getCyNetworkFromCx2 } from '../../../models/CxModel/impl'
import {
  getAttributeDeclarations,
  getNetworkAttributes,
  getNodes,
} from '../../../models/CxModel/impl/extractor'
import { validateCX2 } from '../../../models/CxModel/impl/validator'
import { NetworkProperty } from '../../../models/NetworkSummaryModel'
import { ValueType, ValueTypeName } from '../../../models/TableModel'
import { generateUniqueName } from '../../../utils/generateUniqueName'
import { ActionHandlerProps } from './serviceResultHandlerManager'

export const useUpdateNetwork = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const updateNetworkSummary = useNetworkSummaryStore((state) => state.update)
  const summaries = useNetworkSummaryStore((state) => state.summaries)
  const setNetwork = useNetworkStore((state) => state.add)
  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )
  const setVisualStyle = useVisualStyleStore((state) => state.add)
  const setViewModel = useViewModelStore((state) => state.add)
  const deleteViewModel = useViewModelStore((state) => state.delete)

  const setTables = useTableStore((state) => state.add)
  const addAllOpaqueAspects = useOpaqueAspectStore((state) => state.addAll)
  const setNetworkModified = useWorkspaceStore(
    (state) => state.setNetworkModified,
  )
  const updateNetwork = useCallback(
    async ({ responseObj, networkId }: ActionHandlerProps) => {
      // Validate CX2 data from service app before processing
      const validationResult = validateCX2(responseObj)
      if (!validationResult.isValid) {
        logApi.warn(
          `[${updateNetwork.name}]: Invalid CX2 network from service app: ${validationResult.errors.length} error(s) found`,
          responseObj,
        )
        logApi.warn(
          `[${updateNetwork.name}]: Validation details: ${validationResult.errorMessage}`,
        )
        return
      }
      try {
        let localName = 'Untitled Network'
        let localDescription = ''
        const networkAttributeDeclarations =
          getAttributeDeclarations(responseObj as Cx2)
            ?.attributeDeclarations?.[0]?.networkAttributes ?? {}
        const networkAttributes =
          getNetworkAttributes(responseObj as Cx2)?.[0] ?? {}

        localName =
          networkAttributes.name ??
          generateUniqueName(
            Object.values(summaries).map((s) => s.name),
            localName,
          )
        localDescription =
          networkAttributes.description ??
          summaries[networkId]?.description ??
          localDescription

        const localProperties: NetworkProperty[] = Object.entries(
          networkAttributes,
        ).map(([key, value]) => {
          return {
            predicateString: key,
            value: value as ValueType,
            dataType:
              networkAttributeDeclarations[key]?.d ?? ValueTypeName.String,
            subNetworkId: null,
          }
        })

        const nodesAspect = getNodes(responseObj as Cx2)
        const anyNodeHasPosition = nodesAspect.some(
          (n) => n.x !== undefined && n.y !== undefined,
        )

        // Delete the old view model
        deleteViewModel(networkId)
        const res = getCyNetworkFromCx2(networkId, responseObj as Cx2)
        const {
          network,
          nodeTable,
          edgeTable,
          visualStyle,
          networkViews,
          visualStyleOptions,
          otherAspects,
        } = res
        const localNodeCount = network.nodes.length
        const localEdgeCount = network.edges.length

        setNetwork(network)
        updateNetworkSummary(networkId, {
          name: localName,
          properties: localProperties,
          hasLayout: anyNodeHasPosition,
          description: localDescription,
          modificationTime: new Date(Date.now()),
          nodeCount: localNodeCount,
          edgeCount: localEdgeCount,
        })
        setVisualStyleOptions(networkId, visualStyleOptions)
        setTables(networkId, nodeTable, edgeTable)
        setVisualStyle(networkId, visualStyle)
        if (otherAspects !== undefined) {
          addAllOpaqueAspects(networkId, otherAspects, true)
        }
        const networkView = networkViews[0]
        setViewModel(networkId, {
          ...networkView,
          type: networkView.type ?? DEF_VIEW_TYPE,
          viewId: `${networkId}-${networkView.type ?? DEF_VIEW_TYPE}-updatedByService`,
        })
        setNetworkModified(networkId, true)
      } catch (e) {
        logStore.warn(
          `[${updateNetwork.name}]: Failed to update the current network. `,
          e,
        )
      }
    },
    [
      updateNetworkSummary,
      setNetwork,
      summaries,
      setVisualStyleOptions,
      setVisualStyle,
      setViewModel,
      deleteViewModel,
      setTables,
      addAllOpaqueAspects,
      setNetworkModified,
    ],
  )
  return updateNetwork
}
