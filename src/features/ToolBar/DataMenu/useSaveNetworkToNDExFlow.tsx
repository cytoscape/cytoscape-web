import {
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { ReactNode, useContext, useState } from 'react'

import { AppConfigContext } from '../../../AppConfigContext'
import { fetchNdexSummaries } from '../../../data/external-api/ndex'
import {
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
} from '../../../data/external-api/ndex'
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
import { useSaveCyNetworkCopyToNDEx } from '../../../data/hooks/useSaveCyNetworkCopyToNDEx'
import { useSaveCyNetworkToNDEx } from '../../../data/hooks/useSaveCyNetworkToNDEx'
import { logUi } from '../../../debug'
import { CyDialog } from '@/components/CyDialog'
import { IdType } from '../../../models/IdType'
import { MessageSeverity } from '../../../models/MessageModel'
import { Network } from '../../../models/NetworkModel'
import { HcxValidationSaveDialog } from '../../HierarchyViewer/components/Validation/HcxValidationSaveDialog'
import { useHcxValidatorStore } from '../../HierarchyViewer/store/HcxValidatorStore'

export interface SaveNetworkToNDExFlow {
  /** Save the current network to NDEx, asking first where that needs a choice. */
  start: () => void
  /** The flow's dialogs; the Data menu renders them next to its dropdown. */
  dialogs: ReactNode
}

/** Everything a save sends, read from the stores when the save runs. */
const networkData = (networkId: IdType) => {
  const table = useTableStore.getState().tables[networkId]
  return [
    useNetworkStore.getState().networks.get(networkId) as Network,
    useVisualStyleStore.getState().visualStyles[networkId],
    useNetworkSummaryStore.getState().summaries[networkId],
    table.nodeTable,
    table.edgeTable,
    useViewModelStore.getState().getViewModel(networkId),
    useUiStateStore.getState().ui.visualStyleOptions[networkId],
    useOpaqueAspectStore.getState().opaqueAspects[networkId],
  ] as const
}

const reportError = (prefix: string, e: unknown): void => {
  const message = e instanceof Error ? e.message : String(e)
  useMessageStore.getState().addMessage({
    message: message.includes(TimeOutErrorIndicator)
      ? TimeOutErrorMessage
      : `${prefix} ${message}`,
    duration: 4000,
    severity: MessageSeverity.ERROR,
  })
}

/**
 * Data > Save Network to NDEx, owned by the Data menu rather than its row
 * (#784): the HCX warning and the "Networks out of sync" question open after
 * async checks, once the menu has closed, so their state must outlive the row.
 *
 * - An invalid HCX network asks first (`HcxValidationSaveDialog`).
 * - A network not on NDEx yet is saved as a new copy, replacing the local one.
 * - A network on NDEx is overwritten, unless NDEx holds a newer version: then
 *   the user chooses between overwriting and saving a copy.
 *
 * Network data is read from the stores when the save runs, so the
 * always-mounted menu subscribes to none of it.
 */
export const useSaveNetworkToNDExFlow = (): SaveNetworkToNDExFlow => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  // The network each dialog is asking about; null while it is closed.
  const [hcxNetworkId, setHcxNetworkId] = useState<IdType | null>(null)
  const [outOfSyncNetworkId, setOutOfSyncNetworkId] = useState<IdType | null>(
    null,
  )
  const validationResult = useHcxValidatorStore((state) =>
    hcxNetworkId === null ? undefined : state.validationResults?.[hcxNetworkId],
  )
  const saveNetworkOverwrite = useSaveCyNetworkToNDEx()
  const saveNetworkCopy = useSaveCyNetworkCopyToNDEx()

  const getToken = (): Promise<string> =>
    useCredentialStore.getState().getToken()

  const overwriteNDExNetwork = async (
    networkId: IdType,
    accessToken: string,
  ): Promise<void> => {
    await saveNetworkOverwrite(
      accessToken,
      networkId,
      ...networkData(networkId),
    )
    useWorkspaceStore.getState().setNetworkModified(networkId, false)
    useMessageStore.getState().addMessage({
      message: `Saved network to NDEx`,
      duration: 3000,
      severity: MessageSeverity.SUCCESS,
    })
    setOutOfSyncNetworkId(null)
  }

  const saveCopyToNDEx = async (
    networkId: IdType,
    accessToken: string,
    deleteOriginal: boolean,
  ): Promise<void> => {
    try {
      const uuid = await saveNetworkCopy(
        accessToken,
        ...networkData(networkId),
        deleteOriginal,
      )
      useMessageStore.getState().addMessage({
        message: `Saved a copy of the current network to NDEx with new uuid ${
          uuid as string
        }`,
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (e) {
      logUi.error('[useSaveNetworkToNDExFlow]: Error saving copy to NDEx', e)
      reportError(
        'Error: Could not save a copy of the current network to NDEx.',
        e,
      )
    }
    setOutOfSyncNetworkId(null)
  }

  const saveNetworkToNDEx = async (networkId: IdType): Promise<void> => {
    const accessToken = await getToken()
    const summary = useNetworkSummaryStore.getState().summaries[networkId]

    if (summary?.isNdex === false) {
      await saveCopyToNDEx(networkId, accessToken, true)
      return
    }

    try {
      const ndexSummaries = await fetchNdexSummaries(
        networkId,
        accessToken,
        ndexBaseUrl,
      )
      const ndexModificationTime = ndexSummaries?.[0]?.modificationTime

      if (ndexModificationTime > summary?.modificationTime) {
        setOutOfSyncNetworkId(networkId)
      } else {
        await overwriteNDExNetwork(networkId, accessToken)
      }
    } catch (e) {
      logUi.error(
        '[useSaveNetworkToNDExFlow]: Error saving current network to NDEx',
        e,
      )
      reportError('Error: Could not overwrite the current network to NDEx.', e)
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
    void saveNetworkToNDEx(networkId)
  }

  const dialogs = (
    <>
      <CyDialog
        data-testid="save-to-ndex-sync-dialog"
        open={outOfSyncNetworkId !== null}
      >
        <DialogTitle>Networks out of sync</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The network on NDEx has been modified since the last time you saved
            it from Cytoscape Web. Do you want to create a new copy of this
            network on NDEx instead?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {/* Nothing dismisses on backdrop click or Escape, so without this the
              dialog would force a write to NDEx either way
              (docs/specifications/DIALOG_DISMISS_POLICY.md). */}
          <Button
            data-testid="save-to-ndex-cancel-button"
            variant="outlined"
            onClick={() => setOutOfSyncNetworkId(null)}
          >
            Cancel
          </Button>
          <Button
            data-testid="save-to-ndex-overwrite-button"
            variant="outlined"
            color="error"
            onClick={async () => {
              if (outOfSyncNetworkId === null) return
              await overwriteNDExNetwork(outOfSyncNetworkId, await getToken())
            }}
          >
            No, overwrite the network in NDEx
          </Button>
          <Button
            data-testid="save-to-ndex-copy-button"
            variant="contained"
            onClick={async () => {
              if (outOfSyncNetworkId === null) return
              await saveCopyToNDEx(outOfSyncNetworkId, await getToken(), false)
            }}
          >
            Yes, create copy to NDEx
          </Button>
        </DialogActions>
      </CyDialog>
      <HcxValidationSaveDialog
        open={hcxNetworkId !== null}
        onClose={() => setHcxNetworkId(null)}
        onSubmit={() => {
          // The dialog does not close itself on submit. It used to vanish
          // only because the menu row that rendered it unmounted.
          const networkId = hcxNetworkId
          setHcxNetworkId(null)
          if (networkId !== null) {
            void saveNetworkToNDEx(networkId)
          }
        }}
        validationResult={validationResult}
      />
    </>
  )

  return { start, dialogs }
}
