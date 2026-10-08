import { v4 as uuidv4 } from 'uuid'

import { logApp } from '../../debug'
import {
  exportCyNetworkToCx2,
  getCyNetworkFromCx2,
} from '../../models/CxModel/impl'
import { IdType } from '../../models/IdType'
import { MessageSeverity } from '../../models/MessageModel'
import { putNetworkSummaryToDb } from '../db'
import { buildClonedNetworkSummary } from './cloneNetworkUtil'
import { useUrlNavigation } from './navigation/useUrlNavigation'
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
import { useRegisterNetwork } from './useRegisterNetwork'

/**
 * Returns a function that makes a local, independent copy of a network in the
 * current workspace. The copy is produced by round-tripping the network through
 * CX2 so it is fully detached from the original, given a fresh id, and marked
 * local-only until the user saves it to NDEx (CW-755). No sign-in required.
 */
export const useCloneNetwork = () => {
  const registerNetwork = useRegisterNetwork()
  const { navigateToNetwork } = useUrlNavigation()

  const workspace = useWorkspaceStore((state) => state.workspace)
  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const getViewModel = useViewModelStore((state) => state.getViewModel)
  const addMessage = useMessageStore((state) => state.addMessage)

  const cloneNetwork = (networkId: IdType): IdType | undefined => {
    const network = useNetworkStore.getState().networks.get(networkId)
    const tables = useTableStore.getState().tables[networkId]
    const visualStyle = useVisualStyleStore.getState().visualStyles[networkId]
    const summary = useNetworkSummaryStore.getState().summaries[networkId]
    const visualStyleOptions =
      useUiStateStore.getState().ui.visualStyleOptions[networkId]
    const opaqueAspects =
      useOpaqueAspectStore.getState().opaqueAspects[networkId]
    const viewModel = getViewModel(networkId)

    if (
      network === undefined ||
      tables === undefined ||
      visualStyle === undefined ||
      summary === undefined ||
      viewModel === undefined
    ) {
      addMessage({
        message: 'Could not duplicate the network: it is not fully loaded yet.',
        duration: 4000,
        severity: MessageSeverity.WARNING,
      })
      return undefined
    }

    try {
      const cx = exportCyNetworkToCx2(
        {
          network,
          nodeTable: tables.nodeTable,
          edgeTable: tables.edgeTable,
          visualStyle,
          // Without this the clone is round-tripped through a CX2 that has no
          // cyWebVisualStyles aspect, so the copy arrives with only the active
          // style and every other named style is lost.
          visualStyleSet: getVisualStyleSetSnapshot(networkId),
          networkViews: [viewModel],
          visualStyleOptions,
          otherAspects: opaqueAspects ? [opaqueAspects as any] : undefined,
          undoRedoStack: { undoStack: [], redoStack: [] },
        },
        summary,
        `Copy of ${summary.name}`,
      )

      const newNetworkId = uuidv4()
      const clonedCyNetwork = getCyNetworkFromCx2(newNetworkId, cx)
      const clonedSummary = buildClonedNetworkSummary(summary, newNetworkId)

      // Register the clone first, then add it to the workspace and navigate to it.
      addNetworkToWorkspace(newNetworkId)
      registerNetwork(newNetworkId, clonedCyNetwork, clonedSummary)
      void putNetworkSummaryToDb(clonedSummary)
      setCurrentNetworkId(newNetworkId)
      navigateToNetwork({
        workspaceId: workspace.id,
        networkId: newNetworkId,
        searchParams: new URLSearchParams(location.search),
        replace: false,
      })

      addMessage({
        message: `Created a local copy: "${clonedSummary.name}". Save it to NDEx to keep it.`,
        duration: 4000,
        severity: MessageSeverity.SUCCESS,
      })

      return newNetworkId
    } catch (e) {
      logApp.error(`[useCloneNetwork]: Failed to duplicate network`, e)
      addMessage({
        message: `Could not duplicate the network: ${
          e instanceof Error ? e.message : String(e)
        }`,
        duration: 4000,
        severity: MessageSeverity.ERROR,
      })
      return undefined
    }
  }

  return cloneNetwork
}
