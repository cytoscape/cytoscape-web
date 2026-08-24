import JoinFullOutlinedIcon from '@mui/icons-material/JoinFullOutlined'
import { lazy, ReactElement, Suspense, useState } from 'react'

import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { Network } from '@/models/NetworkModel'
import { NetworkSummary } from '@/models/NetworkSummaryModel'
import { VisualStyle } from '@/models/VisualStyleModel'
import { generateUniqueName } from '@/utils/generateUniqueName'
import type {
  NetworkRecord,
  Pair,
} from '@/features/MergeNetworks/models/DataInterfaceForMerge'
import { getNetTableFromSummary } from '@/features/MergeNetworks/utils/mergeNetworkUtil'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

// Lazy: MergeDialog is a 1000+ line component (plus chroma-js) that would
// otherwise ship with the eager toolbar chunk. Mounted after first open only.
const MergeDialog = lazy(
  () => import('@/features/MergeNetworks/components/MergeDialog'),
)

export const MergeNetwork = ({
  onClick: handleClose,
}: BaseMenuItemProps): ReactElement => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  // Mount latch for the lazy dialog: stays true after the first open so the
  // close animation still plays and reopening is instant.
  const [hasOpenedDialog, setHasOpenedDialog] = useState<boolean>(false)
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
    setHasOpenedDialog(true)
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
      Object.prototype.hasOwnProperty.call(networkTables, networkId) &&
      Object.prototype.hasOwnProperty.call(networkSummaries, networkId) &&
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
      <DropdownMenuItem
        label="Merge Networks"
        icon={<JoinFullOutlinedIcon />}
        onClick={handleOpenDialog}
      />
      {hasOpenedDialog && (
        <Suspense fallback={null}>
          <MergeDialog
            open={openDialog}
            handleClose={handleCloseDialog}
            uniqueName={uniqueName}
            workSpaceNetworks={workSpaceNetworks}
            networksLoaded={networksLoaded}
          />
        </Suspense>
      )}
    </>
  )
}
