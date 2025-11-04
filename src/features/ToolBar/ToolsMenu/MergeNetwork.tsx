import React, { useState, ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import MenuItem from '@mui/material/MenuItem'
import MergeDialog from '../../MergeNetworks/components/MergeDialog'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../hooks/stores/WorkspaceStore'
import { useNetworkSummaryStore } from '../../../hooks/stores/NetworkSummaryStore'
import { NetworkSummary } from '../../../models/NetworkSummaryModel'
import {
  NetworkRecord,
  Pair,
} from '../../MergeNetworks/models/DataInterfaceForMerge'
import { generateUniqueName } from '../../../utils/generate-unique-name'
import { useTableStore } from '../../../hooks/stores/TableStore'
import { useNetworkStore } from '../../../hooks/stores/NetworkStore'
import { getNetTableFromSummary } from '../../MergeNetworks/utils/helper-functions'
import { Network } from '../../../models/NetworkModel'
import { useVisualStyleStore } from '../../../hooks/stores/VisualStyleStore'
import { VisualStyle } from '../../../models/VisualStyleModel'

export const MergeNetwork = ({ handleClose }: BaseMenuProps): ReactElement => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const networkIds: IdType[] = useWorkspaceStore(
    (state) => state.workspace.networkIds,
  )
  const networkSummaries: Record<IdType, NetworkSummary> =
    useNetworkSummaryStore((state) => state.summaries)
  const networkVisualStyles: Record<string, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )
  const networkTables = useTableStore((state) => state.tables)
  const networkStore = useNetworkStore((state) => state.networks)
  const workSpaceNetworks: Pair<string, string>[] = networkIds
    .map((networkId) => {
      const networkName = networkSummaries[networkId]?.name
      return [networkName, networkId]
    })
    .filter((pair) => pair[0] !== undefined && pair[1] !== undefined) as Pair<
    string,
    string
  >[]
  const uniqueName = generateUniqueName(
    workSpaceNetworks.map((net) => net[0]),
    'Merged Network',
  )

  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    handleClose() // Call handleClose from props if needed
  }

  // check whether there are networks that are already loaded
  const networksLoaded: Record<IdType, NetworkRecord> = {}
  networkIds.forEach((networkId) => {
    if (
      networkTables.hasOwnProperty(networkId) &&
      networkSummaries.hasOwnProperty(networkId) &&
      networkStore.has(networkId)
    ) {
      networksLoaded[networkId] = {
        network: networkStore.get(networkId) ?? ({} as Network),
        nodeTable: networkTables[networkId].nodeTable,
        edgeTable: networkTables[networkId].edgeTable,
        netTable: getNetTableFromSummary(networkSummaries[networkId]),
        visualStyle: networkVisualStyles[networkId],
      }
    }
  })

  return (
    <>
      <MenuItem onClick={handleOpenDialog}>Merge Networks</MenuItem>
      <MergeDialog
        open={openDialog}
        handleClose={handleCloseDialog}
        uniqueName={uniqueName}
        workSpaceNetworks={workSpaceNetworks}
        networksLoaded={networksLoaded}
      />
    </>
  )
}
