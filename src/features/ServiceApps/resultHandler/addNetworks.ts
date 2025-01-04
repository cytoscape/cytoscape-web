import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { useNetworkStore } from '../../../store/NetworkStore'
import { putNetworkSummaryToDb } from '../../../store/persist/db'
import { v4 as uuidv4 } from 'uuid'
import { Aspect } from '../../../models/CxModel/Cx2/Aspect'
import { CoreAspectTag } from '../../../models/CxModel/Cx2/CoreAspectTag'
import { ValueType, ValueTypeName } from '../../../models/TableModel'
import { NdexNetworkProperty } from '../../../models/NetworkSummaryModel'
import { Cx2 } from '../../../models/CxModel/Cx2'
import { createDataFromLocalCx2 } from '../../../utils/cx-utils'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useTableStore } from '../../../store/TableStore'
import { useOpaqueAspectStore } from '../../../store/OpaqueAspectStore'

export const useAddNetworks = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const addNetworksToWorkspace: (ids: IdType | IdType[]) => void =
    useWorkspaceStore((state) => state.addNetworkIds)
  const addNewNetwork = useNetworkStore((state) => state.add)
  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )
  const setVisualStyle = useVisualStyleStore((state) => state.add)
  const setViewModel = useViewModelStore((state) => state.add)

  const setTables = useTableStore((state) => state.add)
  const addAllOpaqueAspects = useOpaqueAspectStore((state) => state.addAll)
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const isValidNetworkAttributes = (aspect: Aspect): boolean => {
    return (
      Array.isArray(aspect.networkAttributes) &&
      aspect.networkAttributes.every(
        (attr: any) =>
          typeof attr === 'object' &&
          typeof attr.name === 'string' &&
          (attr.description === undefined ||
            typeof attr.description === 'string'),
      )
    )
  }

  const isValidNodes = (aspect: Aspect): boolean => {
    return (
      Array.isArray(aspect.nodes) &&
      aspect.nodes.every(
        (node: any) => typeof node === 'object' && typeof node.id === 'number',
      )
    )
  }

  const isValidEdges = (aspect: Aspect): boolean => {
    return (
      Array.isArray(aspect.edges) &&
      aspect.edges.every(
        (edge: any) =>
          typeof edge === 'object' &&
          typeof edge.id === 'number' &&
          typeof edge.s === 'number' &&
          typeof edge.t === 'number',
      )
    )
  }

  const isValidCx2Network = (obj: any): boolean => {
    if (!Array.isArray(obj)) {
      console.warn('Invalid Cx2Network: Expected an array of aspects', obj)
      return false
    }

    let hasValidNetworkAttributes = false
    let hasValidNodes = false
    let hasValidEdges = false

    for (const aspect of obj) {
      if (aspect.networkAttributes && isValidNetworkAttributes(aspect)) {
        hasValidNetworkAttributes = true
      } else if (aspect.nodes && isValidNodes(aspect)) {
        hasValidNodes = true
      } else if (aspect.edges && isValidEdges(aspect)) {
        hasValidEdges = true
      }
    }
    return hasValidNetworkAttributes && hasValidNodes && hasValidEdges
  }

  const addNetworks = useCallback(
    async ({ responseObj, networkId }: ActionHandlerProps) => {
      if (!Array.isArray(responseObj)) {
        console.warn(
          'Invalid addNetwork response: Expected an array',
          responseObj,
        )
        return
      }

      let validNetworkIds: IdType[] = []
      for (const item of responseObj) {
        if (isValidCx2Network(item)) {
          try {
            let localName = 'Untitled Network'
            let localDescription = ''
            const NetworkAttributesAspect = CoreAspectTag.NetworkAttributes
            const AttributeDeclarationsAspect =
              CoreAspectTag.AttributeDeclarations
            const networkAttributes = Array.isArray(item)
              ? item
                  .filter((aspect: any) =>
                    aspect.hasOwnProperty(NetworkAttributesAspect),
                  )
                  .map((aspect: any) => aspect[NetworkAttributesAspect])[0][0]
              : {}
            localName = networkAttributes.name ?? localName
            localDescription = networkAttributes.description ?? localDescription

            const attributeDeclarations = Array.isArray(item)
              ? item
                  .filter((aspect: any) =>
                    aspect.hasOwnProperty(AttributeDeclarationsAspect),
                  )
                  .map(
                    (aspect: any) => aspect[AttributeDeclarationsAspect],
                  )[0][0]
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
            const localUuid = uuidv4()

            const res = await createDataFromLocalCx2(localUuid, item as Cx2)
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
            await putNetworkSummaryToDb({
              isNdex: false,
              ownerUUID: localUuid,
              name: localName,
              isReadOnly: false,
              subnetworkIds: [],
              isValid: false,
              warnings: [],
              isShowcase: false,
              isCertified: false,
              indexLevel: '',
              hasLayout: true,
              hasSample: false,
              cxFileSize: 0,
              cx2FileSize: 0,
              properties: localProperties,
              owner: '',
              version: '',
              completed: false,
              visibility: 'PUBLIC',
              nodeCount: localNodeCount,
              edgeCount: localEdgeCount,
              description: localDescription,
              creationTime: new Date(Date.now()),
              externalId: localUuid,
              isDeleted: false,
              modificationTime: new Date(Date.now()),
            })

            setVisualStyleOptions(localUuid, visualStyleOptions)
            addNewNetwork(network)
            setVisualStyle(localUuid, visualStyle)
            setTables(localUuid, nodeTable, edgeTable)
            setViewModel(localUuid, networkView)
            if (otherAspects !== undefined) {
              addAllOpaqueAspects(localUuid, otherAspects)
            }
            validNetworkIds.push(localUuid)
          } catch (error) {
            console.error(error)
          }
        } else {
          console.warn('Invalid Cx2Network item:', item)
        }
      }
      addNetworksToWorkspace(validNetworkIds)
      const nextCurrentNetworkId: IdType | undefined = validNetworkIds[0]
      if (nextCurrentNetworkId !== undefined) {
        setCurrentNetworkId(nextCurrentNetworkId)
      }
    },
    [
      addNetworksToWorkspace,
      addNewNetwork,
      setVisualStyleOptions,
      setVisualStyle,
      setViewModel,
      setTables,
      addAllOpaqueAspects,
      setCurrentNetworkId,
    ],
  )
  return addNetworks
}
