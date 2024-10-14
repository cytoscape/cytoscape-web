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
import {
  createNetworkDataObj,
  createTableDataObj,
} from '../../../features/ServiceApps'
import {
  CytoContainerRequest,
  InputNetwork,
  ScopeType,
} from '../../../features/ServiceApps/model'
import { runTask } from '../../../features/ServiceApps'
import {
  getAlgorithmMetaData,
  getServerStatus,
} from '../../../features/ServiceApps/api'

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

  const onClick = async (): Promise<void> => {
    const serviceUrl = 'https://cd.ndexbio.org/cy/cytocontainer/v1'
    const algorithmName = 'addnetworksexample'
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
    // console.log(networkDataObj)

    // ----------------test get server status-------------------
    const serverStatus = await getServerStatus(serviceUrl)
    console.log(serverStatus)

    // ----------------test get algorithm metaData-------------------
    const algorithmMetaData = await getAlgorithmMetaData(
      serviceUrl,
      algorithmName,
    )
    console.log(algorithmMetaData)

    // ------------------test run task---------------------
    const result = await runTask(serviceUrl, algorithmName, networkDataObj)
    console.log(result)
    handleClose()
  }

  return (
    <>
      <MenuItem onClick={onClick}>Community Detection Test</MenuItem>
    </>
  )
}
