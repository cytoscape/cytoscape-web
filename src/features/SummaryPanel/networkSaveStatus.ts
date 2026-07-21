export type SaveAction = 'none' | 'overwrite' | 'copy' | 'signin'

export interface SaveButtonState {
  /** What clicking the button should do. */
  action: SaveAction
  /** True when there are no unsaved changes (show the green check). */
  upToDate: boolean
  /** Tooltip text describing the current status / available action. */
  tooltip: string
}

/**
 * Decide how the network's save/status button should look and behave (CW-488).
 * Replaces the old red "modified" dot: an unsaved network shows an upload
 * button that saves on click, while an up-to-date network shows a green check.
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
