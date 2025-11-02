import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { useNetworkStore } from '../../../store/NetworkStore'
import { putNetworkSummaryToDb } from '../../../store/persist/db'
import { v4 as uuidv4 } from 'uuid'
import { CoreAspectTag } from '../../../models/CxModel/Cx2/CoreAspectTag'
import { ValueType, ValueTypeName } from '../../../models/TableModel'
import {
  NdexNetworkProperty,
  Visibility,
} from '../../../models/NetworkSummaryModel'
import { Cx2 } from '../../../models/CxModel/Cx2'
import {
  createDataFromLocalCx2,
  isValidCx2Network,
} from '../../../utils/cx-utils'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useTableStore } from '../../../store/TableStore'
import { useOpaqueAspectStore } from '../../../store/OpaqueAspectStore'
import { generateUniqueName } from '../../../utils/generate-unique-name'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import {
  getAttributeDeclarations,
  getNetworkAttributes,
  getNodes,
} from '../../../models/CxModel/cx2-util'
import { logApp } from '../../../debug'
import { useUrlNavigation } from '../../../store/hooks/useUrlNavigation/useUrlNavigation'

export const useAddNetworks = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const summaries = useNetworkSummaryStore((state) => state.summaries)
  const addSummaries = useNetworkSummaryStore((state) => state.addAll)
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
  const { navigateToNetwork } = useUrlNavigation()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const addNetworks = useCallback(
    async ({ responseObj, networkId }: ActionHandlerProps) => {
      if (!Array.isArray(responseObj)) {
        logApp.warn(
          `[${addNetworks.name}]: Invalid addNetwork response: Expected an array`,
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
            const networkAttributeDeclarations =
              getAttributeDeclarations(item as Cx2)?.attributeDeclarations?.[0]
                ?.networkAttributes ?? {}
            const networkAttributes =
              getNetworkAttributes(item as Cx2)?.[0] ?? {}

            localName =
              networkAttributes.name ??
              generateUniqueName(
                Object.values(summaries).map((s) => s.name),
                localName,
              )
            localDescription = networkAttributes.description ?? localDescription

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

            const nodesAspect = getNodes(item as Cx2)
            const anyNodeHasPosition = nodesAspect.some(
              (n) => n.x !== undefined && n.y !== undefined,
            )
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
            const summary = {
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
              hasLayout: anyNodeHasPosition,
              hasSample: false,
              cxFileSize: 0,
              cx2FileSize: 0,
              properties: localProperties,
              owner: '',
              version: '',
              completed: false,
              visibility: Visibility.PUBLIC,
              nodeCount: localNodeCount,
              edgeCount: localEdgeCount,
              description: localDescription,
              creationTime: new Date(Date.now()),
              externalId: localUuid,
              isDeleted: false,
              modificationTime: new Date(Date.now()),
            }
            await putNetworkSummaryToDb(summary)

            addSummaries({ [localUuid]: summary })
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
            logApp.error(`[${addNetworks.name}]: Error adding network:`, error)
          }
        } else {
          logApp.warn(`[${addNetworks.name}]: Invalid Cx2Network item:`, item)
        }
      }
      addNetworksToWorkspace(validNetworkIds)
      const nextCurrentNetworkId: IdType | undefined = validNetworkIds[0]
      if (nextCurrentNetworkId !== undefined) {
        setCurrentNetworkId(nextCurrentNetworkId)
        navigateToNetwork({
          workspaceId: workspace.id,
          networkId: nextCurrentNetworkId,
          searchParams: new URLSearchParams(location.search),
          replace: false,
        })
      }
    },
    [
      summaries,
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
