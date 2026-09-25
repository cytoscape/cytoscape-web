import { IdType } from '../../../models/IdType'

interface ResolveShownSubNetworkIdParams {
  // Subnetwork last registered and rendered by SubNetworkPanel
  queryNetworkId: IdType
  // ID of the subnetwork returned by the query for the selected subsystem;
  // undefined while that query has no data
  fetchedNetworkId: IdType | undefined
  hasError: boolean
  // True while the panel shows loading or rendering progress in place of the
  // subnetwork
  isLoading: boolean
  hasViewModel: boolean
}

/**
 * Decide which subnetwork SubNetworkPanel publishes as shown (#758).
 *
 * `queryNetworkId` keeps naming the previous subnetwork while a newly selected
 * subsystem loads or after its fetch fails. Publishing it then would point the
 * share URL at a subnetwork the user no longer sees, so return an ID only when
 * it matches the data fetched for the selected subsystem and the panel is
 * actually rendering it.
 *
 * @returns the shown subnetwork's ID, or '' when none is shown
 */
export const resolveShownSubNetworkId = ({
  queryNetworkId,
  fetchedNetworkId,
  hasError,
  isLoading,
  hasViewModel,
}: ResolveShownSubNetworkIdParams): IdType => {
  if (
    queryNetworkId === '' ||
    hasError ||
    isLoading ||
    !hasViewModel ||
    fetchedNetworkId !== queryNetworkId
  ) {
    return ''
  }
  return queryNetworkId
}
