import { IdType } from '../../models/IdType'
import { isViewOfNetwork } from '../../models/UiModel/impl/uiImpl'

/**
 * The active network view to use once `networkId` has finished loading.
 *
 * The load makes the loaded network the active view, except when the active
 * view is already one of that network's subnetworks. A shared link can restore
 * a cached subnetwork view before the main network load completes (#965), and
 * resetting it here would undo the link's state.
 */
export const activeViewAfterLoad = (
  activeNetworkView: IdType | undefined,
  networkId: IdType,
): IdType =>
  activeNetworkView !== undefined &&
  isViewOfNetwork(activeNetworkView, networkId)
    ? activeNetworkView
    : networkId
