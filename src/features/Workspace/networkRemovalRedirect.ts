import { IdType } from '../../models/IdType'
import { Workspace } from '../../models/WorkspaceModel'

/**
 * Where the URL has to go once the network it names is no longer in the
 * workspace, or `undefined` when it can stay.
 *
 * The URL is what loads a network (`WorkspaceEditor`'s swap effect), so it
 * must follow `currentNetworkId`, which the delete orchestrator repairs. A
 * pointer that still names a removed network (a removal that bypassed the
 * orchestrator) falls back to the orchestrator's own choice, the first
 * remaining network. `''` is the network list, `/<workspace>/networks`.
 */
export const redirectAfterRemoval = (
  urlNetworkId: IdType | undefined,
  workspace: Pick<Workspace, 'networkIds' | 'currentNetworkId'>,
): IdType | undefined => {
  if (urlNetworkId === undefined || urlNetworkId === '') {
    return undefined
  }
  const { networkIds, currentNetworkId } = workspace
  if (networkIds.includes(urlNetworkId)) {
    return undefined
  }
  if (currentNetworkId === '' || networkIds.includes(currentNetworkId)) {
    return currentNetworkId
  }
  return networkIds[0] ?? ''
}
