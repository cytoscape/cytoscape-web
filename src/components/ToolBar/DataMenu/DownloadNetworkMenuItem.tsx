import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { exportNetworkToCx2 } from '../../../store/exportCX'
import { Network } from '../../../models/NetworkModel'

export const DownloadNetworkMenuItem = (
  props: BaseMenuProps,
): ReactElement => {

  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const table = useTableStore((state) => state.tables[currentNetworkId])

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const viewModel = useViewModelStore(
    (state) => state.viewModels[currentNetworkId],
  )
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[currentNetworkId],
  )
  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  ) as Network


  const saveNetworkToFile = async (): Promise<void> => {
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      table.nodeTable,
      table.edgeTable,
      viewModel,
      `Copy of ${summary.name}`,
    )
    console.log(summary);
    const link = document.createElement("a");
    link.download = `${summary.name}.cx2`;
    const cxFile = new Blob([JSON.stringify(cx)], {type: 'text/plain'});
    link.href = URL.createObjectURL(cxFile);
    link.click();
    props.handleClose()
  }

  const handleSaveCurrentNetworkToFile = async (): Promise<void> => {
    await saveNetworkToFile()
  }

  const menuItem = (
    <MenuItem
      onClick={handleSaveCurrentNetworkToFile}
    >
      Download the current network
    </MenuItem>
  )
    return <>{menuItem}</>
}
