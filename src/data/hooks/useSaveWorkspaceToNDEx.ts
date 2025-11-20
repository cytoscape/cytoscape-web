import {
  createNdexWorkspace,
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
  updateNdexWorkspace,
} from '../external-api/ndex'
import { getWorkspaceFromDb } from '../db'
import { logApi } from '../../debug'
import {
  CyApp,
  Network,
  NetworkSummary,
  NetworkView,
  VisualStyle,
} from '../../models'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { MessageSeverity } from '../../models/MessageModel'
import { OpaqueAspects } from '../../models/OpaqueAspectModel'
import { TableRecord } from '../../models/StoreModel/TableStoreModel'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import { useMessageStore } from './stores/MessageStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useLoadCyNetwork } from './useLoadCyNetwork'
import { useSaveCyNetworkCopyToNDEx } from './useSaveCyNetworkCopyToNDEx'
import { useSaveCyNetworkToNDEx } from './useSaveCyNetworkToNDEx'

/**
 * Hook that returns a function to save a workspace to NDEx.
 *
 * Saves all networks in the workspace and the workspace itself to NDEx.
 *
 * @returns Function to save a workspace to NDEx
 */
export const useSaveWorkspace = () => {
  const deleteNetworkModifiedStatus = useWorkspaceStore(
    (state) => state.deleteNetworkModifiedStatus,
  )
  const addMessage = useMessageStore((state) => state.addMessage)
  const saveNetworkToNDEx = useSaveCyNetworkToNDEx()
  const saveCopyToNDEx = useSaveCyNetworkCopyToNDEx()
  const loadCyNetwork = useLoadCyNetwork()
  const setId = useWorkspaceStore((state) => state.setId)
  const renameWorkspace = useWorkspaceStore((state) => state.setName)
  const setIsRemote = useWorkspaceStore((state) => state.setIsRemote)

  const saveWorkspace = async (
    accessToken: string,
    allNetworkId: string[],
    networkModifiedStatus: Record<string, boolean | undefined>,
    networks: Map<string, Network>,
    visualStyles: Record<string, VisualStyle>,
    summaries: Record<string, NetworkSummary>,
    tables: Record<string, TableRecord>,
    viewModels: Record<string, NetworkView[]>,
    networkVisualStyleOpt: Record<string, VisualStyleOptions>,
    opaqueAspects: Record<string, OpaqueAspects>,
    isUpdate: boolean,
    workspaceName: string,
    currentWorkspaceId: string,
    apps: Record<string, CyApp>,
    serviceApps: Record<string, ServiceApp>,
    workspaceToBeOverwritten?: string,
  ): Promise<void> => {
    // Save all networks to NDEx
    for (const networkId of allNetworkId) {
      let network = networks.get(networkId) as Network
      let visualStyle = visualStyles[networkId]
      const summary = summaries[networkId]
      let nodeTable = tables[networkId]?.nodeTable
      let edgeTable = tables[networkId]?.edgeTable
      let networkViews: NetworkView[] = viewModels[networkId]
      let visualStyleOptions: VisualStyleOptions | undefined =
        networkVisualStyleOpt[networkId]

      let opaqueAspect = opaqueAspects[networkId]

      try {
        if (!network || !visualStyle || !nodeTable || !edgeTable) {
          const res = await loadCyNetwork(networkId, accessToken)
          // Using parentheses to perform destructuring assignment correctly
          ;({
            network,
            nodeTable,
            edgeTable,
            visualStyle,
            networkViews,
            visualStyleOptions,
          } = res)

          if (res.otherAspects) {
            opaqueAspect = res.otherAspects.reduce(
              (acc: OpaqueAspects, aspect: OpaqueAspects) => {
                const [aspectName, aspectData] = Object.entries(aspect)[0]
                acc[aspectName] = aspectData
                return acc
              },
              {} as OpaqueAspects,
            )
          } else {
            opaqueAspect = {}
          }
        }
        if (summary.isNdex === false) {
          await saveCopyToNDEx(
            accessToken,
            network,
            visualStyle,
            summary,
            nodeTable,
            edgeTable,
            networkViews?.[0],
            visualStyleOptions,
            opaqueAspect,
            true,
          )
          continue
        }

        if (networkModifiedStatus[networkId] === true) {
          await saveNetworkToNDEx(
            accessToken,
            networkId,
            network,
            visualStyle,
            summary,
            nodeTable,
            edgeTable,
            networkViews?.[0],
            visualStyleOptions,
            opaqueAspect,
          )
          deleteNetworkModifiedStatus(networkId)
        }
      } catch (e) {
        const errorMessage =
          e instanceof Error
            ? e.message
            : typeof e === 'string'
              ? e
              : 'Unknown error occurred'
        if (errorMessage.includes(TimeOutErrorIndicator)) {
          addMessage({
            message: TimeOutErrorMessage,
            duration: 3000,
            severity: MessageSeverity.ERROR,
          })
        } else {
          addMessage({
            message: `Error: Unable to save ${summary.isNdex ? 'the network' : 'a copy of the local network'}(${summary.name}) to NDEx: ${errorMessage}`,
            duration: 3000,
            severity: MessageSeverity.ERROR,
          })
        }
        logApi.error(
          `[${saveWorkspace.name}]:[${networkId}]: Unable to save workspace ${e}`,
        )
      }
    }

    // Save workspace to NDEx
    try {
      const activeApps = Object.keys(apps).filter(
        (key) => apps[key].status === AppStatus.Active,
      )
      const serviceAppNames = Object.keys(serviceApps)
      const workspace = await getWorkspaceFromDb(currentWorkspaceId)
      const workspaceData = {
        name: workspaceName,
        options: {
          currentNetwork: workspace.currentNetworkId,
          activeApps: activeApps,
          serviceApps: serviceAppNames,
        },
        networkIDs: workspace.networkIds,
      }

      if (isUpdate) {
        const targetWorkspaceId = workspaceToBeOverwritten ?? currentWorkspaceId
        await updateNdexWorkspace(targetWorkspaceId, workspaceData, accessToken)
        if (workspaceToBeOverwritten) {
          setId(workspaceToBeOverwritten)
        }
      } else {
        const response = await createNdexWorkspace(workspaceData, accessToken)
        const { uuid } = response
        setId(uuid)
      }
      setIsRemote(true)
      renameWorkspace(workspaceName)
      addMessage({
        message: 'Saved workspace to NDEx successfully.',
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : 'Unknown error occurred'
      addMessage({
        message: `Failed to save workspace to NDEx: ${errorMessage}`,
        duration: 4000,
        severity: MessageSeverity.ERROR,
      })
      logApi.error(
        `[${saveWorkspace.name}]: Failed to save workspace to NDEx`,
        e,
      )
      throw e
    }
  }
  return saveWorkspace
}
