import { useCallback, useEffect, useRef } from 'react'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { TableRecord } from '../../models/StoreModel/TableStoreModel'
import { useAppStore } from '../AppStore'
import { useNetworkStore } from '../NetworkStore'
import { useNetworkSummaryStore } from '../NetworkSummaryStore'
import { useTableStore } from '../TableStore'
import { useViewModelStore } from '../ViewModelStore'
import { useVisualStyleStore } from '../VisualStyleStore'
import { useWorkspaceStore } from '../WorkspaceStore'
import { useUiStateStore } from '../UiStateStore'
import { NetworkView } from '../../models/ViewModel'
import { ServiceStatus } from '../../models/AppModel/ServiceStatus'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { VisualStyle } from '../../models/VisualStyleModel'
import { Network } from '../../models/NetworkModel'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'

// TODO: Move these from features to other folders
import { useRunTask } from '../../features/ServiceApps'
import { useServiceResultHandlerManager } from '../../features/ServiceApps/resultHandler/serviceResultHandlerManager'

/**
 * Custom hook to provide a function to run a service task for a given URL
 *
 * @returns Function to run a service task for a given URL
 *
 */
export const useServiceTaskRunner = (): ((url: string) => Promise<void>) => {
  // TODO: This need to be changed to include the data builder
  //       And also it should return the correct data type defined in the service app model
  const runTask = useRunTask()

  // Data to be used for the service task
  const currentNetworkId: string = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const table: TableRecord = useTableStore(
    (state) => state.tables[currentNetworkId],
  )
  const summary: NdexNetworkSummary = useNetworkSummaryStore(
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

  // Registered service apps
  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const clearCurrentTask = useAppStore((state) => state.clearCurrentTask)
  const { getHandler } = useServiceResultHandlerManager()

  // Create refs to store the latest values
  const currentNetworkIdRef = useRef(currentNetworkId)
  const networkRef = useRef(network)
  const visualStyleRef = useRef(visualStyle)
  const summaryRef = useRef(summary)
  const tableRef = useRef(table)
  const visualStyleOptionsRef = useRef(visualStyleOptions)
  const viewModelRef = useRef(viewModel)

  // Update refs whenever the values change
  useEffect(() => {
    currentNetworkIdRef.current = currentNetworkId
    networkRef.current = network
    visualStyleRef.current = visualStyle
    summaryRef.current = summary
    tableRef.current = table
    visualStyleOptionsRef.current = visualStyleOptions
    viewModelRef.current = viewModel
  }, [
    currentNetworkId,
    network,
    visualStyle,
    summary,
    table,
    visualStyleOptions,
    viewModel,
  ])

  const run = useCallback(
    async (url: string): Promise<void> => {
      // This contains all available service apps
      const serviceApp: ServiceApp = serviceApps[url]
      if (!serviceApp) {
        throw new Error(`Service not found for URL: ${url}`)
      }

      if (networkRef.current === undefined) {
        throw new Error('Network not found')
      }

      try {
        const customParameters = serviceApp.parameters.reduce(
          (acc, param) => {
            acc[param.displayName] = param.value ?? param.defaultValue
            return acc
          },
          {} as { [key: string]: string },
        )
        // Run the task here..
        const result = await runTask({
          serviceUrl: url,
          algorithmName: serviceApp.name,
          customParameters: customParameters,
          network: networkRef.current,
          table: tableRef.current,
          visualStyle: visualStyleRef.current,
          summary: summaryRef.current,
          visualStyleOptions: visualStyleOptionsRef.current,
          viewModel: viewModelRef.current,
          serviceInputDefinition: serviceApp.serviceInputDefinition,
        })

        console.log(`Got response from service:`, result)

        // Process the result to update the workspace state
        if (result.status === ServiceStatus.Complete) {
          for (const { action, data } of result.result) {
            const actionHandler = getHandler(action)
            if (actionHandler === undefined) {
              throw new Error(`Unsupported action: ${action}`)
            }
            actionHandler({
              responseObj: data,
              networkId: currentNetworkIdRef.current,
            })
          }
        }
      } catch (e) {
        console.error(`Failed to run the task: ${serviceApp.name}`, e)
      } finally {
        clearCurrentTask()
      }

      console.log(`Task finished!`, serviceApp.name)
    },
    [serviceApps, runTask, getHandler, clearCurrentTask],
  )

  return run
}
