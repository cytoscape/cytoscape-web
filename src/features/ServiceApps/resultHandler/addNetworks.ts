import { useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { putNetworkSummaryToDb } from '../../../data/db'
import { logApp } from '../../../debug'
import { useUrlNavigation } from '../../../data/hooks/navigation/useUrlNavigation'
import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../../data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
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
import { IdType } from '../../../models/IdType'
import {
  NetworkProperty,
  Visibility,
} from '../../../models/NetworkSummaryModel'
import { ValueType, ValueTypeName } from '../../../models/TableModel'
import { generateUniqueName } from '../../../utils/generateUniqueName'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { createNetworkSummary } from '../../../models/NetworkSummaryModel/impl/networkSummaryImpl'

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

      const validNetworkIds: IdType[] = []
      for (const item of responseObj) {
        // Validate CX2 data from service app before processing
        const validationResult = validateCX2(item)
        if (validationResult.isValid) {
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

            const nodesAspect = getNodes(item as Cx2)
            const anyNodeHasPosition = nodesAspect.some(
              (n) => n.x !== undefined && n.y !== undefined,
            )
            const localUuid = uuidv4()

            const res = getCyNetworkFromCx2(localUuid, item as Cx2)
            const {
              network,
              nodeTable,
              edgeTable,
              visualStyle,
              networkViews,
              visualStyleOptions,
              otherAspects,
            } = res

            const summary = createNetworkSummary({
              networkId: localUuid,
              name: localName,
              description: localDescription,
              properties: localProperties,
              hasLayout: anyNodeHasPosition,
              visibility: Visibility.PUBLIC,
              externalId: localUuid,
              ownerUUID: localUuid,
            })
            await putNetworkSummaryToDb(summary)

            addSummaries({ [localUuid]: summary })
            setVisualStyleOptions(localUuid, visualStyleOptions)
            addNewNetwork(network)
            setVisualStyle(localUuid, visualStyle)
            setTables(localUuid, nodeTable, edgeTable)
            setViewModel(localUuid, networkViews[0])
            if (otherAspects !== undefined) {
              addAllOpaqueAspects(localUuid, otherAspects)
            }
            validNetworkIds.push(localUuid)
          } catch (error) {
            logApp.error(`[${addNetworks.name}]: Error adding network:`, error)
          }
        } else {
          logApp.warn(
            `[${addNetworks.name}]: Invalid Cx2Network item: ${validationResult.errorMessage ?? 'Unknown validation error'}`,
            item,
          )
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
