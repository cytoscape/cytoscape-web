import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { useUiStateStore } from '../../../hooks/stores/UiStateStore'
import { useVisualStyleStore } from '../../../hooks/stores/VisualStyleStore'
import {
  DEF_VIEW_TYPE,
  useViewModelStore,
} from '../../../hooks/stores/ViewModelStore'
import { useTableStore } from '../../../hooks/stores/TableStore'
import { useOpaqueAspectStore } from '../../../hooks/stores/OpaqueAspectStore'
import {
  createDataFromLocalCx2,
  isValidCx2Network,
} from '../../../models/CxModel/impl'
import { useNetworkSummaryStore } from '../../../hooks/stores/NetworkSummaryStore'
import { CoreAspectTag } from '../../../models/CxModel/Cx2/CoreAspectTag'
import { NdexNetworkProperty } from '../../../models/NetworkSummaryModel'
import { useWorkspaceStore } from '../../../hooks/stores/WorkspaceStore'
import { ValueType, ValueTypeName } from '../../../models/TableModel'
import { Cx2 } from '../../../models/CxModel/Cx2'
import { useNetworkStore } from '../../../hooks/stores/NetworkStore'
import { generateUniqueName } from '../../../utils/generate-unique-name'
import {
  getAttributeDeclarations,
  getNetworkAttributes,
  getNodes,
} from '../../../models/CxModel/cx2-util'
import { logApi, logStore } from '../../../debug'

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
      if (!isValidCx2Network(responseObj)) {
        logApi.warn(
          `[${updateNetwork.name}]: Invalid update network response`,
          responseObj,
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

        const localProperties: NdexNetworkProperty[] = Object.entries(
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
        const res = await createDataFromLocalCx2(networkId, responseObj as Cx2)
        const {
          network,
          nodeTable,
          edgeTable,
          visualStyle,
          networkView,
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
          nodeCount: localNodeCount,
          edgeCount: localEdgeCount,
          modificationTime: new Date(Date.now()),
        })
        setVisualStyleOptions(networkId, visualStyleOptions)
        setTables(networkId, nodeTable, edgeTable)
        setVisualStyle(networkId, visualStyle)
        if (otherAspects !== undefined) {
          addAllOpaqueAspects(networkId, otherAspects, true)
        }
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
