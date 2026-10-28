import { logUi } from '@/debug'
import { readCx2ElementCounts } from '@/models/CxModel/impl/cx2ElementCounts'
import {
  fitsNetworkSizeLimits,
  NetworkSizeLimits,
} from '@/models/NetworkSummaryModel/impl/networkSizeLimit'
import { formatBytes } from '@/utils/byteConversion'

// The metaData aspect follows the version entry, so the head holds it.
const CX2_HEAD_BYTES = 64 * 1024

/**
 * Checks a CX2 file against the network size limits that also gate Open
 * Network(s) from NDEx, using the counts its metaData declares, before the
 * whole file is read. Returns the message saying why the network is too
 * large, or undefined when it fits.
 */
export const cx2TooLargeMessage = async (
  file: File,
  limits: NetworkSizeLimits,
): Promise<string | undefined> => {
  let head = ''
  try {
    head = await file.slice(0, CX2_HEAD_BYTES).text()
  } catch (error) {
    logUi.warn(
      `[cx2TooLargeMessage]: Could not read the start of ${file.name}; checking its size only`,
      error,
    )
  }
  const { nodeCount, edgeCount } = readCx2ElementCounts(head)
  if (
    fitsNetworkSizeLimits(
      { nodeCount, edgeCount, cx2FileSize: file.size },
      limits,
    )
  ) {
    return undefined
  }
  const why =
    nodeCount === undefined || edgeCount === undefined
      ? `it is ${formatBytes(file.size)} and does not list its node and edge counts, so it must be under ${formatBytes(limits.maxNetworkFileSize)}`
      : `it has ${nodeCount.toLocaleString()} nodes and ${edgeCount.toLocaleString()} edges. A network opens if it has at most ${limits.maxEdgeCountThreshold.toLocaleString()} edges, or fewer than ${limits.maxNetworkElementsThreshold.toLocaleString()} nodes and edges combined in a file under ${formatBytes(limits.maxNetworkFileSize)}`
  return `${file.name} is too large to be loaded into Cytoscape Web: ${why}.`
}
