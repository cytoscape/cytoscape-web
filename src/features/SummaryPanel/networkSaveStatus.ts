export type SaveAction = 'none' | 'overwrite' | 'copy' | 'signin'

export interface SaveButtonState {
  /** What clicking the button should do. */
  action: SaveAction
  /** True when there are no unsaved changes (the upload icon stays neutral). */
  upToDate: boolean
}

/**
 * Decide how the network's save entry should look and behave (CW-488).
 * Replaces the old red "modified" dot: an unsaved network gets an orange upload
 * icon, while an up-to-date network keeps the same icon in the menu's own colour.
 *
 * Only an NDEx network can be "up to date with NDEx", so only it has nothing to
 * save when unmodified. A local network can always be saved as a new copy, as
 * Data > Save Copy to NDEx allows, whether or not it has changed (#640).
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
  const upToDate = !networkModified

  if (isNdex && upToDate) {
    return { action: 'none', upToDate }
  }

  if (!authenticated) {
    return { action: 'signin', upToDate }
  }

  return { action: isNdex ? 'overwrite' : 'copy', upToDate }
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
