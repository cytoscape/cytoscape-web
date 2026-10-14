import { useContext } from 'react'

import { AppConfigContext } from '../../AppConfigContext'
import { logUi } from '../../debug'
import { KeycloakContext } from '@/boot/keycloak'
import { MessageSeverity } from '../../models/MessageModel'
import { Network } from '../../models/NetworkModel'
import {
  fetchNdexSummaries,
  hasNdexEditPermission,
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
} from '../external-api/ndex'
import { useCredentialStore } from './stores/CredentialStore'
import { useMessageStore } from './stores/MessageStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useSaveCyNetworkCopyToNDEx } from './useSaveCyNetworkCopyToNDEx'
import { useSaveCyNetworkToNDEx } from './useSaveCyNetworkToNDEx'

/**
 * Returns a function that saves the current network to NDEx, used by the
 * workspace save/status button (CW-488). Only the current network's data is
 * loaded in the stores, so this always acts on `currentNetworkId`.
 *
 * Mirrors the Data > Save to NDEx menu logic without its modal dialogs: a local
 * network is saved as a new NDEx network, an NDEx network the user can edit is
 * overwritten, and if NDEx holds a newer version the save is refused (the user
 * is directed to the Data menu, which has the conflict dialog) rather than
 * silently clobbering remote changes.
 */
export const useSaveCurrentNetworkToNDEx = () => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const client = useContext(KeycloakContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const addMessage = useMessageStore((state) => state.addMessage)
  const setNetworkModified = useWorkspaceStore(
    (state) => state.setNetworkModified,
  )
  const getViewModel = useViewModelStore((state) => state.getViewModel)
  const saveNetworkOverwrite = useSaveCyNetworkToNDEx()
  const saveNetworkCopy = useSaveCyNetworkCopyToNDEx()

  const save = async (): Promise<void> => {
    const authenticated = client?.authenticated ?? false
    const networkId = useWorkspaceStore.getState().workspace.currentNetworkId
    if (networkId === '') {
      return
    }

    if (!authenticated) {
      addMessage({
        message: 'Please sign in to save this network to NDEx.',
        duration: 4000,
        severity: MessageSeverity.WARNING,
      })
      return
    }

    const summary = useNetworkSummaryStore.getState().summaries[networkId]
    const network = useNetworkStore
      .getState()
      .networks.get(networkId) as Network
    const tables = useTableStore.getState().tables[networkId]
    const visualStyle = useVisualStyleStore.getState().visualStyles[networkId]
    const visualStyleOptions =
      useUiStateStore.getState().ui.visualStyleOptions[networkId]
    const opaqueAspects =
      useOpaqueAspectStore.getState().opaqueAspects[networkId]
    const viewModel = getViewModel(networkId)

    if (
      summary === undefined ||
      network === undefined ||
      tables === undefined ||
      visualStyle === undefined ||
      viewModel === undefined
    ) {
      addMessage({
        message: 'Could not save: the network is not fully loaded yet.',
        duration: 4000,
        severity: MessageSeverity.WARNING,
      })
      return
    }

    try {
      const accessToken = await getToken()

      if (summary.isNdex === false) {
        // Local network: save it as a new NDEx network (keep the local one).
        const uuid = await saveNetworkCopy(
          accessToken,
          network,
          visualStyle,
          summary,
          tables.nodeTable,
          tables.edgeTable,
          viewModel,
          visualStyleOptions,
          opaqueAspects,
          false,
        )
        addMessage({
          message: `Saved this network to NDEx (new id ${uuid}).`,
          duration: 3000,
          severity: MessageSeverity.SUCCESS,
        })
        return
      }

      const hasPermission = await hasNdexEditPermission(
        networkId,
        accessToken,
        ndexBaseUrl,
      )
      if (!hasPermission) {
        addMessage({
          message: 'You do not have edit permission for this NDEx network.',
          duration: 4000,
          severity: MessageSeverity.WARNING,
        })
        return
      }

      // Avoid clobbering a newer version on NDEx.
      const ndexSummaries = await fetchNdexSummaries(
        networkId,
        accessToken,
        ndexBaseUrl,
      )
      const ndexModificationTime = ndexSummaries?.[0]?.modificationTime
      if (
        ndexModificationTime !== undefined &&
        summary.modificationTime !== undefined &&
        ndexModificationTime > summary.modificationTime
      ) {
        addMessage({
          message:
            'NDEx has a newer version of this network. Use Data > Save to NDEx to review before overwriting.',
          duration: 6000,
          severity: MessageSeverity.WARNING,
        })
        return
      }

      await saveNetworkOverwrite(
        accessToken,
        networkId,
        network,
        visualStyle,
        summary,
        tables.nodeTable,
        tables.edgeTable,
        viewModel,
        visualStyleOptions,
        opaqueAspects,
      )
      setNetworkModified(networkId, false)
      addMessage({
        message: 'Saved network to NDEx.',
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      logUi.error(
        `[useSaveCurrentNetworkToNDEx]: Failed to save network to NDEx`,
        e,
      )
      addMessage({
        message: message.includes(TimeOutErrorIndicator)
          ? TimeOutErrorMessage
          : `Error: Could not save the network to NDEx. ${message}`,
        duration: 4000,
        severity: MessageSeverity.ERROR,
      })
    }
  }

  return save
}
