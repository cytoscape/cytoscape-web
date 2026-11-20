import { useCallback, useContext, useEffect, useRef } from 'react'

import { AppConfigContext } from '../../AppConfigContext'
import { logApp } from '../../debug'
import { isHCX } from '../../features/HierarchyViewer/utils/hierarchyUtil'
import {
  buildCustomParameters,
  ndexNetworkUrl,
  sendsNoData,
} from '../../models/AppModel/impl'
// TODO: Move these from features to other folders
import { useRunTask } from '../../features/ServiceApps'
import { useServiceResultHandlerManager } from '../../features/ServiceApps/resultHandler/serviceResultHandlerManager'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { ServiceAppAction } from '../../models/AppModel/ServiceAppAction'
import { ServiceStatus } from '../../models/AppModel/ServiceStatus'
import { MessageSeverity } from '../../models/MessageModel'
import { Network } from '../../models/NetworkModel'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { OpaqueAspects } from '../../models/OpaqueAspectModel'
import { TableRecord } from '../../models/StoreModel/TableStoreModel'
import { NetworkView } from '../../models/ViewModel'
import { VisualStyle } from '../../models/VisualStyleModel'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import { useAppStore } from './stores/AppStore'
import { useCredentialStore } from './stores/CredentialStore'
import { useMessageStore } from './stores/MessageStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useViewModelStore } from './stores/ViewModelStore'
import {
  getVisualStyleSetSnapshot,
  useVisualStyleStore,
} from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'

/**
 * Result actions that write to the network the task was started on. The
 * others (`addNetworks`, `openURL`) need no target and always run.
 */
const NETWORK_TARGETED_ACTIONS: ReadonlySet<ServiceAppAction> = new Set([
  ServiceAppAction.AddTables,
  ServiceAppAction.UpdateLayouts,
  ServiceAppAction.UpdateNetwork,
  ServiceAppAction.UpdateSelection,
  ServiceAppAction.UpdateTables,
])

export interface RunTaskResult {
  status: ServiceStatus
  algorithmName: string
  message: string
}

/**
 * Custom hook to provide a function to run a service task for a given URL
 *
 * @returns Function to run a service task for a given URL
 *
 */
export const useServiceTaskRunner = (): ((
  url: string,
) => Promise<RunTaskResult>) => {
  // TODO: This need to be changed to include the data builder
  //       And also it should return the correct data type defined in the service app model
  const runTask = useRunTask()

  const { ndexBaseUrl } = useContext(AppConfigContext)

  const getToken = useCredentialStore((state) => state.getToken)

  // Data to be used for the service task
  const currentNetworkId: string = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const table: TableRecord = useTableStore(
    (state) => state.tables[currentNetworkId],
  )
  const summary: NetworkSummary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )
  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )
  const visualStyle: VisualStyle = useVisualStyleStore(
    (state) => state.visualStyles[currentNetworkId],
  )
  const visualStyleOptions: VisualStyleOptions = useUiStateStore(
    (state) => state.ui.visualStyleOptions[currentNetworkId],
  )
  const network: Network | undefined = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  )
  const addMessage = useMessageStore((state) => state.addMessage)

  const opaqueAspect: OpaqueAspects = useOpaqueAspectStore(
    (state) => state.opaqueAspects[currentNetworkId],
  )

  // Registered service apps
  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const { getHandler } = useServiceResultHandlerManager()

  // Create refs to store the latest values
  const currentNetworkIdRef = useRef(currentNetworkId)
  const networkRef = useRef(network)
  const visualStyleRef = useRef(visualStyle)
  const summaryRef = useRef(summary)
  const tableRef = useRef(table)
  const visualStyleOptionsRef = useRef(visualStyleOptions)
  const viewModelRef = useRef(viewModel)
  const opaqueAspectRef = useRef(opaqueAspect)

  // Update refs whenever the values change
  useEffect(() => {
    currentNetworkIdRef.current = currentNetworkId
    networkRef.current = network
    visualStyleRef.current = visualStyle
    summaryRef.current = summary
    tableRef.current = table
    visualStyleOptionsRef.current = visualStyleOptions
    viewModelRef.current = viewModel
    opaqueAspectRef.current = opaqueAspect
  }, [
    currentNetworkId,
    network,
    visualStyle,
    summary,
    table,
    visualStyleOptions,
    viewModel,
    opaqueAspect,
  ])

  const run = useCallback(
    async (url: string): Promise<RunTaskResult> => {
      // This contains all available service apps
      const serviceApp: ServiceApp = serviceApps[url]
      if (!serviceApp) {
        throw new Error(`Service not found for URL: ${url}`)
      }

      // Keep the inputs and result actions on the network that started the task.
      const networkId = currentNetworkIdRef.current
      const input = {
        network: networkRef.current,
        table: tableRef.current,
        visualStyle: visualStyleRef.current,
        // Taken with `visualStyle`, before the token wait below: read after
        // it, the set could describe a style activated meanwhile.
        visualStyleSet: getVisualStyleSetSnapshot(networkId),
        summary: summaryRef.current,
        visualStyleOptions: visualStyleOptionsRef.current,
        viewModel: viewModelRef.current,
        opaqueAspect: opaqueAspectRef.current,
      }
      // Apps that request no data (type 'none') skip the network/table guards.
      if (!sendsNoData(serviceApp.serviceInputDefinition)) {
        if (
          serviceApp.serviceInputDefinition?.inputNetwork &&
          input.network === undefined
        ) {
          throw new Error('Network not found')
        }

        if (
          serviceApp.serviceInputDefinition?.inputColumns &&
          input.table === undefined
        ) {
          throw new Error('Table not found')
        }
      }

      // Resolve the current network's NDEx URL for auto-filled ndexUUID
      // parameters; empty when the network is not an NDEx network (CW-620).
      const currentSummary = input.summary
      const currentNdexNetworkUrl =
        currentSummary?.isNdex && currentSummary?.externalId
          ? ndexNetworkUrl(ndexBaseUrl, currentSummary.externalId)
          : ''

      // The user's NDEx access token for auto-filled accessToken params;
      // empty when the user is not signed in (CW-619).
      const accessToken = (await getToken()) ?? ''

      const customParameters = buildCustomParameters(serviceApp.parameters, {
        ndexNetworkUrl: currentNdexNetworkUrl,
        accessToken,
      })
      // Run the task here..
      const result = await runTask({
        serviceUrl: url,
        algorithmName: serviceApp.name,
        customParameters: customParameters,
        ...input,
        serviceInputDefinition: serviceApp.serviceInputDefinition,
      })

      logApp.info(
        `[${useServiceTaskRunner.name}]: Got response from service:`,
        result,
      )

      // Process the result to update the workspace state
      if (result.status === ServiceStatus.Complete) {
        let targetRemovedReported = false
        for (const { action, data } of result.result) {
          // The target is fixed at task start, so it can be deleted while the
          // service runs or while an earlier action waits (updateLayouts
          // queues behind a running layout). Writing to it then would add
          // the network back to the stores, outside the workspace list.
          // Checked per action: the delete can land between two of them.
          if (
            NETWORK_TARGETED_ACTIONS.has(action) &&
            !useNetworkStore.getState().networks.has(networkId)
          ) {
            logApp.warn(
              `[${useServiceTaskRunner.name}]: Skipped ${action}: network ${networkId} was removed while the task ran`,
            )
            if (!targetRemovedReported) {
              targetRemovedReported = true
              addMessage({
                message: `The network was removed while ${serviceApp.name} ran, so its updates to that network were skipped`,
                duration: 4000,
                severity: MessageSeverity.WARNING,
              })
            }
            continue
          }
          // Currently, HCX network is blocked for updateNetwork actions
          // In the future, if there are more limitations, we can turn these checker into a function
          if (
            action === ServiceAppAction.UpdateNetwork &&
            isHCX(useNetworkSummaryStore.getState().summaries[networkId])
          ) {
            addMessage({
              message: `Update network action is not supported for HCX networks`,
              duration: 4000,
              severity: MessageSeverity.WARNING,
            })
            continue
          }
          const actionHandler = getHandler(action)
          if (actionHandler === undefined) {
            throw new Error(`Unsupported action: ${action}`)
          }
          await actionHandler({
            responseObj: data,
            networkId,
          })
        }
      }

      logApp.info(
        `[${useServiceTaskRunner.name}]: Task finished!`,
        serviceApp.name,
      )

      return {
        status: result.status,
        algorithmName: serviceApp.name,
        message: result.message,
      } as RunTaskResult
    },
    [serviceApps, runTask, getHandler, addMessage, ndexBaseUrl, getToken],
  )

  return run
}
