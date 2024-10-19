import { useCallback } from 'react'
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

import { createNetworkDataObj, useRunTask } from '../../features/ServiceApps'
import { useServiceResultHandlerManager } from '../../features/ServiceApps/resultHandler/serviceResultHandlerManager'

// TODO: This should be removed and replaced with the official models
import { InputNetwork, ScopeType } from '../../features/ServiceApps/model'

/**
 * Custom hook to provide a function to run a service task for a given URL
 *
 * @returns Function to run a service task
 *
 */
export const useServiceTaskRunner = (): ((url: string) => Promise<void>) => {
  // TODO: This need to be changed to include the data builder
  const runTask = useRunTask()

  // This contains all available service apps
  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const currentNetworkId: string = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const table: TableRecord = useTableStore(
    (state) => state.tables[currentNetworkId],
  )

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[currentNetworkId],
  )
  const visualStyleOptions = useUiStateStore(
    (state) => state.ui.visualStyleOptions[currentNetworkId],
  )

  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  )

  const clearCurrentTask = useAppStore((state) => state.clearCurrentTask)
  const { getHandler } = useServiceResultHandlerManager()

  const run = useCallback(async (url: string): Promise<void> => {
    const serviceApp: ServiceApp = serviceApps[url]
    if (!serviceApp) {
      throw new Error(`Service not found for URL: ${url}`)
    }

    if (network === undefined) {
      throw new Error('Network not found')
    }

    // TODO: this should be part of runTask function.
    const networkDataObj = createNetworkDataObj(
      ScopeType.all, // This should be removed
      {
        model: 'network',
        format: 'cx2',
      } as InputNetwork,
      network,
      visualStyle,
      summary,
      table,
      visualStyleOptions,
      viewModel,
    )

    try {
      // Run the task here..
      const result = await runTask({
        serviceUrl: url,
        algorithmName: serviceApp.name,
        data: networkDataObj, // This should be removed an computed in the runTask function
      })

      // Process the result to update the workspace state
      if (result.status === ServiceStatus.Complete) {
        for (const { action, data } of result.result) {
          const actionHandler = getHandler(action)
          if (actionHandler === undefined) {
            throw new Error(`Unsupported action: ${action}`)
          }
          actionHandler({
            responseObj: data,
            networkId: currentNetworkId,
          })
        }
      }
      clearCurrentTask()
    } catch (e) {
      clearCurrentTask()
      console.error(`Failed to run the task: ${serviceApp.name}`, e)
    }

    console.log(`Task finished!`, serviceApp.name)
  }, [])

  return run
}
