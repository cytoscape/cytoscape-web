import { IdType } from '../../models/IdType'
import { NetworkSummary, Visibility } from '../../models/NetworkSummaryModel'
import { createNetworkSummary } from '../../models/NetworkSummaryModel/impl/networkSummaryImpl'

export const CLONE_NAME_PREFIX = 'Copy of '

/**
 * Build the summary for a locally-cloned network (CW-755). The clone is always
 * local — never on NDEx — until the user explicitly saves it, so all
 * NDEx-specific identity is reset to the new local id, visibility is LOCAL, and
 * isNdex is false even when cloning a network that came from NDEx. Layout state
 * and element counts are carried over so the clone opens looking like the
 * original without a re-layout.
 */
export const buildClonedNetworkSummary = (
  source: NetworkSummary,
  newNetworkId: IdType,
): NetworkSummary =>
  createNetworkSummary({
    networkId: newNetworkId,
    name: `${CLONE_NAME_PREFIX}${source.name}`,
    description: source.description,
    version: source.version,
    properties: source.properties,
    hasLayout: source.hasLayout,
    visibility: Visibility.LOCAL,
    isNdex: false,
    externalId: newNetworkId,
    ownerUUID: newNetworkId,
    nodeCount: source.nodeCount,
    edgeCount: source.edgeCount,
  })
