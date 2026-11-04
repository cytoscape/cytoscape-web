import { fetchNodeNamesByIds } from '../../../../data/external-api/ndex'
import { logUi } from '../../../../debug'
import { NetworkSummary } from '../../../../models/NetworkSummaryModel'
import { getHcxMetadata } from '../../utils/hierarchyUtil'

/**
 * Where the Cell View looks up protein names: the interaction network named
 * by this hierarchy's own HCX metadata.
 */
export interface InteractionNetworkSource {
  // Undefined when the hierarchy names no interaction network
  id: string | undefined
  hostUrl: string
}

// Anchored and without nested quantifiers, so linear in the input length
const DECIMAL_ID = /^\d+$/

/**
 * Whether a subsystem member is a node id in the interaction network (as
 * `HCX::members` holds) rather than a protein name. Accepts non-negative
 * integers, and their decimal strings.
 */
export const isNumericMemberId = (member: unknown): boolean => {
  if (typeof member === 'number') {
    return Number.isSafeInteger(member) && member >= 0
  }
  return typeof member === 'string' && DECIMAL_ID.test(member)
}

/**
 * Read the interaction network from the hierarchy's network summary.
 *
 * @returns undefined while the summary has not loaded. The Cell View must not
 * build before then: it would have nowhere to look names up and would label
 * the protein rings with their numeric ids (#933).
 */
export const interactionNetworkSource = (
  summary: NetworkSummary | undefined,
  defaultHostUrl: string,
): InteractionNetworkSource | undefined => {
  if (summary === undefined) return undefined

  const metadata = getHcxMetadata(summary)
  const host = metadata?.interactionNetworkHost
  return {
    id: metadata?.interactionNetworkUUID,
    hostUrl: host === undefined || host === '' ? defaultHostUrl : host,
  }
}

/**
 * Look up the protein names of the hierarchy's members.
 *
 * Only member lists made of node ids need a lookup; lists of names are shown
 * as they are. A failed lookup is logged and yields no names, so the rings fall
 * back to their ids instead of the Cell View failing.
 *
 * @returns Map from member id (as a decimal string) to protein name
 */
export const resolveMemberNames = async ({
  members,
  interactionNetworkId,
  interactionNetworkHostUrl,
  getToken,
}: {
  members: readonly unknown[]
  interactionNetworkId: string | undefined
  interactionNetworkHostUrl: string
  getToken: () => Promise<string>
}): Promise<Map<string, string>> => {
  if (
    interactionNetworkId === undefined ||
    interactionNetworkId === '' ||
    members.length === 0 ||
    !members.every(isNumericMemberId)
  ) {
    return new Map()
  }

  try {
    const token = await getToken()
    return await fetchNodeNamesByIds(
      interactionNetworkId,
      members.map((member) => Number(member)),
      token,
      interactionNetworkHostUrl,
    )
  } catch (e) {
    logUi.warn(
      `[${resolveMemberNames.name}]: Failed to look up member names in ${interactionNetworkId}`,
      e,
    )
    return new Map()
  }
}
