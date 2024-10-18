import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import MenuItem from '@mui/material/MenuItem'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel'
import { useTableStore } from '../../../store/TableStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { Network } from '../../../models/NetworkModel'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { VisualStyle } from '../../../models/VisualStyleModel'
import { NetworkView } from '../../../models'
import { VisualStyleOptions } from '../../../models/VisualStyleModel/VisualStyleOptions'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useAppStore } from '../../../store/AppStore'
import {
  createNetworkDataObj,
  createTableDataObj,
} from '../../../features/ServiceApps'
import {
  CytoContainerRequest,
  InputNetwork,
  ResultStatus,
  ScopeType,
} from '../../../features/ServiceApps/model'
import { useRunTask } from '../../../features/ServiceApps'
import {
  getAlgorithmMetaData,
  getServerStatus,
} from '../../../features/ServiceApps/api'
import { useServiceResultHandlerManager } from '../../../features/ServiceApps/resultHandler/serviceResultHandlerManager'
import { ServiceAppTask } from '../../../models/AppModel/ServiceAppTask'

export const TestButton = ({ handleClose }: BaseMenuProps): ReactElement => {
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const table = useTableStore((state) => state.tables[currentNetworkId])

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
  ) as VisualStyleOptions

  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  ) as Network

  const setCurrentTask = useAppStore((state) => state.setCurrentTask)
  const serviceUrl =
    'https://cd.ndexbio.org/cy/cytocontainer/v1/updatetablesexample'
  const actionType = useAppStore(
    (state) => state.serviceApps[serviceUrl]?.cyWebAction,
  )
  const algorithmName = useAppStore(
    (state) => state.serviceApps[serviceUrl]?.name,
  )
  const { getHandler } = useServiceResultHandlerManager()
  const { runTask } = useRunTask()

  const onClick = async (): Promise<void> => {
    try {
      const networkDataObj = createNetworkDataObj(
        ScopeType.all,
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
      const tableDataObj = createTableDataObj(
        table.nodeTable,
        ScopeType.all,
        [],
        [],
      )

      // --------------------- get the action handler ---------------------

      const actionHandler = getHandler(actionType)
      if (actionHandler === undefined) {
        throw new Error(`Unsupported action: ${actionType}`)
      }

      // -------------------------- test run task --------------------------

      const result = await runTask({
        serviceUrl,
        algorithmName,
        data: networkDataObj,
      })
      setCurrentTask({
        id: result.id,
        status: result.status,
        progress: result.progress,
        message: result.message,
      } as ServiceAppTask)
      console.log(result)

      // --------------------- test handle the results ---------------------
      if (result.status === ResultStatus.complete) {
        actionHandler({
          responseObj: result.result as JsonNode[],
          networkId: currentNetworkId,
        })
      }
    } catch (error) {
      console.error(error)
    }
    handleClose()
  }

  return (
    <>
      <MenuItem onClick={onClick}>Community Detection Test</MenuItem>
    </>
  )
}
