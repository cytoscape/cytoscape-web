import { lazy, ReactElement, Suspense } from 'react'

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
import { LazyDialogBoundary } from '@/features/LazyDialogBoundary'

// Lazy: MergeDialog is a 1000+ line component (plus chroma-js) that would
// otherwise ship with the eager toolbar chunk.
const MergeDialog = lazy(
  () => import('@/features/MergeNetworks/components/MergeDialog'),
)

interface MergeNetworkDialogHostProps {
  handleClose: () => void
}

/**
 * The Merge Networks dialog, owned by the Tools menu rather than its menu row
 * (#784). The Tools menu mounts it only while the dialog is open: it
 * subscribes to every network and table, and a closed dialog must not
 * re-render on table edits. Mounting per open also gives every open fresh
 * fields (the merged network's unique name, the chosen networks), as the row
 * did when it unmounted with the menu.
 */
export const MergeNetworkDialogHost = ({
  handleClose,
}: MergeNetworkDialogHostProps): ReactElement => {
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
    <LazyDialogBoundary name="Merge Networks">
      <Suspense fallback={null}>
        <MergeDialog
          open={true}
          handleClose={handleClose}
          uniqueName={uniqueName}
          workSpaceNetworks={workSpaceNetworks}
          networksLoaded={networksLoaded}
        />
      </Suspense>
    </LazyDialogBoundary>
  )
}
