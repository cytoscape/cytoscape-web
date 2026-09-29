import { ReactNode, useState } from 'react'

import {
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
} from '../../../data/external-api/ndex'
import { useUrlNavigation } from '../../../data/hooks/navigation/useUrlNavigation'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../../data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useLoadNetworkSummaries } from '../../../data/hooks/useLoadNetworkSummaries'
import { useSaveCyNetworkCopyToNDEx } from '../../../data/hooks/useSaveCyNetworkCopyToNDEx'
import { logUi } from '../../../debug'
import { NetworkSummary } from '../../../models'
import { IdType } from '../../../models/IdType'
import { MessageSeverity } from '../../../models/MessageModel'
import { Network } from '../../../models/NetworkModel'
import { HcxValidationSaveDialog } from '../../HierarchyViewer/components/Validation/HcxValidationSaveDialog'
import { useHcxValidatorStore } from '../../HierarchyViewer/store/HcxValidatorStore'

export interface SaveNetworkCopyToNDExFlow {
  /** Save a copy of the current network, asking first if its HCX is invalid. */
  start: () => void
  /** The flow's dialogs; the Data menu renders them next to its dropdown. */
  dialogs: ReactNode
}

/**
 * Data > Save Copy to NDEx, owned by the Data menu rather than its row (#784):
 * the HCX warning opens after the menu has closed, so its state must outlive
 * the row. Network data is read from the stores when the save runs, so the
 * always-mounted menu subscribes to none of it.
 */
export const useSaveNetworkCopyToNDExFlow = (): SaveNetworkCopyToNDExFlow => {
  // The network whose invalid HCX the warning dialog is asking about.
  const [hcxNetworkId, setHcxNetworkId] = useState<IdType | null>(null)
  const validationResult = useHcxValidatorStore((state) =>
    hcxNetworkId === null ? undefined : state.validationResults?.[hcxNetworkId],
  )
  const { navigateToNetwork } = useUrlNavigation()
  const saveNetworkCopy = useSaveCyNetworkCopyToNDEx()
  const loadNetworkSummaries = useLoadNetworkSummaries()

  const saveCopyToNDEx = async (networkId: IdType): Promise<void> => {
    const { addMessage } = useMessageStore.getState()
    const accessToken = await useCredentialStore.getState().getToken()

    try {
      const table = useTableStore.getState().tables[networkId]
      const uuid = await saveNetworkCopy(
        accessToken,
        useNetworkStore.getState().networks.get(networkId) as Network,
        useVisualStyleStore.getState().visualStyles[networkId],
        useNetworkSummaryStore.getState().summaries[networkId],
        table.nodeTable,
        table.edgeTable,
        useViewModelStore.getState().getViewModel(networkId),
        useUiStateStore.getState().ui.visualStyleOptions[networkId],
        useOpaqueAspectStore.getState().opaqueAspects[networkId],
        false, // keep the original network
      )
      const summaries = await loadNetworkSummaries(uuid as IdType, accessToken)

      useNetworkSummaryStore
        .getState()
        .add(uuid, summaries[uuid] as NetworkSummary)
      const workspaceStore = useWorkspaceStore.getState()
      workspaceStore.addNetworkIds(uuid)
      workspaceStore.setCurrentNetworkId(uuid as IdType)
      navigateToNetwork({
        workspaceId: workspaceStore.workspace.id,
        networkId: uuid as IdType,
        searchParams: new URLSearchParams(location.search),
        replace: false,
      })
      addMessage({
        message: `Saved a copy of the current network to NDEx with new uuid ${
          uuid as string
        }`,
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      logUi.error(
        '[useSaveNetworkCopyToNDExFlow]: Failed to save a copy of the current network to NDEx',
        e,
      )
      addMessage({
        message: message.includes(TimeOutErrorIndicator)
          ? TimeOutErrorMessage
          : `Error: Could not save a copy of the current network to NDEx. ${message}`,
        duration: 4000,
        severity: MessageSeverity.ERROR,
      })
    }
  }

  const start = (): void => {
    const networkId = useWorkspaceStore.getState().workspace.currentNetworkId
    const result =
      useHcxValidatorStore.getState().validationResults?.[networkId]
    if (result !== undefined && !result.isValid) {
      setHcxNetworkId(networkId)
      return
    }
    void saveCopyToNDEx(networkId)
  }

  const dialogs = (
    <HcxValidationSaveDialog
      open={hcxNetworkId !== null}
      onClose={() => setHcxNetworkId(null)}
      onSubmit={() => {
        // The dialog does not close itself on submit. It used to vanish
        // only because the menu row that rendered it unmounted.
        const networkId = hcxNetworkId
        setHcxNetworkId(null)
        if (networkId !== null) {
          void saveCopyToNDEx(networkId)
        }
      }}
      validationResult={validationResult}
    />
  )

  return { start, dialogs }
}
