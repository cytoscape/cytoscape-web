import { IdType } from '../../models'

export interface ResolveShareTargetParams {
  /** Explicit target passed by the subnetwork (right) toolbar, if any. */
  targetNetworkId?: IdType
  /** The UI's active network view (set when a subnetwork pane is clicked). */
  activeNetworkView: IdType
  /** The network the toolbar's page is showing (the hierarchy on the left). */
  currentNetworkId: IdType
  /** The subnetwork currently rendered in the hierarchy viewer, or ''. */
  shownSubNetworkId: IdType
}

/**
 * Decide which network id the share URL should encode as `activeNetworkView`.
 *
 * The subnetwork (right) toolbar passes an explicit `targetNetworkId`, so its
 * URL always captures the subnetwork. The hierarchy (left) toolbar passes none
 * and previously fell back only to `activeNetworkView`; if the user selected a
 * system but never clicked the subnetwork pane, `activeNetworkView` still
 * pointed at the hierarchy and the subnetwork was dropped from the URL — the
 * two sides disagreed (CW-654).
 *
 * This adds a final fallback to the subnetwork currently shown in the viewer,
 * guarded so it only applies to a subnetwork of the current hierarchy.
 */
export const resolveShareTargetNetworkId = ({
  targetNetworkId,
  activeNetworkView,
  currentNetworkId,
  shownSubNetworkId,
}: ResolveShareTargetParams): IdType | undefined => {
  if (targetNetworkId !== undefined) {
    return targetNetworkId
  }

  if (activeNetworkView !== '' && activeNetworkView !== currentNetworkId) {
    return activeNetworkView
  }

  if (
    shownSubNetworkId !== '' &&
    shownSubNetworkId.startsWith(`${currentNetworkId}_`)
  ) {
    return shownSubNetworkId
  }

  return undefined
}
