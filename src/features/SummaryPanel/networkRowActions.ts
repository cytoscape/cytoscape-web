/**
 * Availability of the network actions offered by a summary row's overflow menu.
 *
 * Every action here runs against the loaded (current) network: the stores hold
 * the data of that network alone, and the image export renders the live view.
 * A row that is not the current network therefore offers the actions disabled,
 * naming what to do about it — the same shape `getSaveMenuItemState` uses for
 * the save entry (see `networkSaveStatus.ts`).
 */
export interface RowActionState {
  /** Secondary text naming what currently blocks the action, if anything. */
  hint?: string
  /** True whenever a hint blocks the action. */
  disabled: boolean
}

export interface RowActionStates {
  openInCytoscape: RowActionState
  duplicate: RowActionState
  download: RowActionState
  exportImage: RowActionState
  share: RowActionState
}

/** Shown when the row is not the network that is currently open. */
export const NOT_CURRENT_HINT = 'Open this network first'

/** Shown when a local network has no NDEx URL to share yet. */
export const LOCAL_NETWORK_SHARE_HINT = 'Save this network to NDEx first'

const toState = (hint: string | undefined): RowActionState => ({
  hint,
  disabled: hint !== undefined,
})

export const getRowActionStates = ({
  isCurrentNetwork,
  isNdex,
  isCyDeskAvailable,
  cyDeskHint,
}: {
  isCurrentNetwork: boolean
  isNdex: boolean
  /** False once polling has found no Cytoscape Desktop to talk to. */
  isCyDeskAvailable: boolean
  /** Explanation for an unavailable Cytoscape Desktop, from FeatureAvailability. */
  cyDeskHint: string
}): RowActionStates => {
  // An action's own blocker is reported ahead of the row not being open, since
  // opening the network would not make the action available.
  const notCurrent = isCurrentNetwork ? undefined : NOT_CURRENT_HINT

  return {
    openInCytoscape: toState(!isCyDeskAvailable ? cyDeskHint : notCurrent),
    duplicate: toState(notCurrent),
    download: toState(notCurrent),
    exportImage: toState(notCurrent),
    share: toState(!isNdex ? LOCAL_NETWORK_SHARE_HINT : notCurrent),
  }
}
