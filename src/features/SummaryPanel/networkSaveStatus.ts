export type SaveAction = 'none' | 'overwrite' | 'copy' | 'signin'

export interface SaveButtonState {
  /** What clicking the button should do. */
  action: SaveAction
  /** True when there are no unsaved changes (the upload icon stays neutral). */
  upToDate: boolean
  /** Tooltip text describing the current status / available action. */
  tooltip: string
}

/**
 * Decide how the network's save entry should look and behave (CW-488).
 * Replaces the old red "modified" dot: an unsaved network offers a save that
 * runs on click and an orange upload icon, while an up-to-date network keeps the
 * same icon in the menu's own colour.
 * Anonymous users are told to sign in rather than being offered a broken save.
 */
export const getSaveButtonState = ({
  networkModified,
  isNdex,
  authenticated,
}: {
  networkModified: boolean
  isNdex: boolean
  authenticated: boolean
}): SaveButtonState => {
  if (!networkModified) {
    return {
      action: 'none',
      upToDate: true,
      tooltip: isNdex ? 'Up to date with NDEx' : 'No unsaved changes',
    }
  }

  if (!authenticated) {
    return {
      action: 'signin',
      upToDate: false,
      tooltip: 'Unsaved changes — sign in to save this network to NDEx',
    }
  }

  if (isNdex) {
    return {
      action: 'overwrite',
      upToDate: false,
      tooltip: 'Unsaved changes — click to save to NDEx',
    }
  }

  return {
    action: 'copy',
    upToDate: false,
    tooltip: 'Unsaved changes — click to save a copy to NDEx',
  }
}

export interface SaveMenuItemState {
  /** Primary text: the save action the item offers, whether or not it is available. */
  label: string
  /** Secondary text naming what currently blocks the save, if anything. */
  hint?: string
  /** True whenever a hint blocks the save. */
  disabled: boolean
}

/**
 * Text and enabled state of the save entry in a network row's overflow menu.
 *
 * The label always names the save action, so the menu reads the same whether or
 * not saving is available right now; anything blocking it is named in the hint.
 * Saving can only run on the loaded (current) network, since the stores hold the
 * data of that network alone.
 */
export const getSaveMenuItemState = ({
  saveAction,
  isNdex,
  isCurrentNetwork,
}: {
  saveAction: SaveAction
  isNdex: boolean
  isCurrentNetwork: boolean
}): SaveMenuItemState => {
  const label = isNdex ? 'Save to NDEx' : 'Save a Copy to NDEx'

  const hint =
    saveAction === 'none'
      ? 'No unsaved changes'
      : saveAction === 'signin'
        ? 'Sign in to save to NDEx'
        : !isCurrentNetwork
          ? 'Open this network first'
          : undefined

  return { label, hint, disabled: hint !== undefined }
}

export interface NetworkProvenance {
  /** Where the network came from. Short enough for a chip. */
  origin: 'NDEx' | 'Local'
  /** Tooltip for the origin chip. */
  originTooltip: string
  /**
   * Visible label for local edits that are not in the network's remote copy,
   * or undefined when there is nothing unsaved.
   */
  modifiedLabel?: string
  /** Tooltip for that label. */
  modifiedTooltip?: string
}

/**
 * Origin and local-modification state of one network row (#697).
 *
 * `networkModified` already drove the save icon's colour and tooltip, which
 * left the most consequential fact about an NDEx-backed network — that editing
 * it here does not touch the copy in NDEx — visible only on hover. This returns
 * the same state as text the row can render at rest.
 *
 * Origin and modification are reported separately on purpose: the chip says
 * where the network came from, not where its current contents are.
 */
export const getNetworkProvenance = ({
  networkModified,
  isNdex,
}: {
  networkModified: boolean
  isNdex: boolean
}): NetworkProvenance => {
  const origin: NetworkProvenance['origin'] = isNdex ? 'NDEx' : 'Local'
  const originTooltip = isNdex
    ? 'Opened from the NDEx database (ndexbio.org). Your working copy is stored in this browser.'
    : 'Created or imported here. This network exists only in this browser until you save it to NDEx or export it.'

  if (!networkModified) {
    return { origin, originTooltip }
  }

  return {
    origin,
    originTooltip,
    modifiedLabel: isNdex ? 'Changes not saved to NDEx' : 'Modified locally',
    modifiedTooltip: isNdex
      ? 'Edited since it was opened from NDEx. The copy in NDEx is unchanged until you save to it.'
      : 'Edited since it was created or imported. The changes are saved in this browser only.',
  }
}
