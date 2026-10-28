/**
 * Whether a CX2 network is small enough for Cytoscape Web to open. One rule
 * for every source, so a network that opens from NDEx also opens from a local
 * file: Open Network(s) from NDEx checks the counts and size NDEx reports, and
 * Network from File checks those the file's metaData declares.
 */

/** The `config.json` thresholds the rule reads. */
export interface NetworkSizeLimits {
  readonly maxEdgeCountThreshold: number
  readonly maxNetworkElementsThreshold: number
  /** In bytes. */
  readonly maxNetworkFileSize: number
}

export interface NetworkSize {
  /** Undefined when the source does not say. */
  readonly nodeCount?: number
  readonly edgeCount?: number
  /** In bytes. */
  readonly cx2FileSize: number
}

/**
 * A network opens if it has at most `maxEdgeCountThreshold` edges. One with
 * more edges opens only if it has fewer than `maxNetworkElementsThreshold`
 * nodes and edges combined and its file is under `maxNetworkFileSize`.
 *
 * Without both counts only the file size can be checked. A missing count is
 * never read as zero: zero edges would pass the first test whatever the size.
 *
 * Passing on the edge count alone, whatever the file size, is a known
 * limitation: see "Known Limitation" in
 * features/ToolBar/ToolBar_docs/ToolBar.md.
 */
export const fitsNetworkSizeLimits = (
  size: NetworkSize,
  limits: NetworkSizeLimits,
): boolean => {
  const { nodeCount, edgeCount, cx2FileSize } = size
  const fileFits = cx2FileSize < limits.maxNetworkFileSize
  if (nodeCount === undefined || edgeCount === undefined) {
    return fileFits
  }
  return (
    edgeCount <= limits.maxEdgeCountThreshold ||
    (nodeCount + edgeCount < limits.maxNetworkElementsThreshold && fileFits)
  )
}
