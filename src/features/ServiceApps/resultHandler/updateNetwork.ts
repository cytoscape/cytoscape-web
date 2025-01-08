import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useTableStore } from '../../../store/TableStore'
import { useOpaqueAspectStore } from '../../../store/OpaqueAspectStore'
import {
  createDataFromLocalCx2,
  isValidCx2Network,
} from '../../../utils/cx-utils'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { CoreAspectTag } from '../../../models/CxModel/Cx2/CoreAspectTag'
import { NdexNetworkProperty } from '../../../models/NetworkSummaryModel'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { ValueType, ValueTypeName } from '../../../models/TableModel'
import { Cx2 } from '../../../models/CxModel/Cx2'
import { useNetworkStore } from '../../../store/NetworkStore'

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
        console.warn('Invalid update network response', responseObj)
        return
      }
      try {
        let localName = summaries[networkId]?.name ?? 'Untitled Network'
        let localDescription = summaries[networkId]?.description ?? ''
        const NetworkAttributesAspect = CoreAspectTag.NetworkAttributes
        const AttributeDeclarationsAspect = CoreAspectTag.AttributeDeclarations
        const networkAttributes = Array.isArray(responseObj)
          ? responseObj
              .filter((aspect: any) =>
                aspect.hasOwnProperty(NetworkAttributesAspect),
              )
              .map((aspect: any) => aspect[NetworkAttributesAspect])[0][0]
          : {}
        localName = networkAttributes.name ?? localName
        localDescription = networkAttributes.description ?? localDescription

        const attributeDeclarations = Array.isArray(responseObj)
          ? responseObj
              .filter((aspect: any) =>
                aspect.hasOwnProperty(AttributeDeclarationsAspect),
              )
              .map((aspect: any) => aspect[AttributeDeclarationsAspect])[0][0]
          : {}

        const networkAttributeDeclarations = (attributeDeclarations as any)
          ?.networkAttributes

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
        
        deleteViewModel(networkId)
        setNetwork(network)
        updateNetworkSummary(networkId, {
          name: localName,
          properties: localProperties,
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
        setViewModel(networkId, networkView)
        setNetworkModified(networkId, true)
      } catch (e) {
        console.warn('Failed to update the current network. ', e)
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
