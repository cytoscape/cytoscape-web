/**
 * Which view of a hierarchy a search ran on. `undefined` for a network that
 * is not a hierarchy, where there is only one view to name.
 */
export type SearchView = 'main' | 'subnetwork' | undefined

export interface SearchResultCounts {
  query: string
  nodeCount: number
  edgeCount: number
  searchedNodes: boolean
  searchedEdges: boolean
  view: SearchView
}

export interface SearchResultSummary {
  /** Shown in the search field, e.g. `2 nodes · 13 edges`. */
  label: string
  /** Shown instead of `label` when the field is narrow, e.g. `2 · 13`. */
  compactLabel: string
  /** The count's tooltip and the screen-reader announcement. */
  sentence: string
}

const VIEW_NAMES: Record<Exclude<SearchView, undefined>, string> = {
  main: 'main network view',
  subnetwork: 'subnetwork view',
}

const plural = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

/**
 * The words the search field uses to report what a search selected. Only the
 * object types that were searched are counted.
 */
export const describeSearchResult = ({
  query,
  nodeCount,
  edgeCount,
  searchedNodes,
  searchedEdges,
  view,
}: SearchResultCounts): SearchResultSummary => {
  const where = view === undefined ? '' : ` in the ${VIEW_NAMES[view]}`

  if (nodeCount === 0 && edgeCount === 0) {
    return {
      label: 'No matches',
      compactLabel: 'No matches',
      sentence: `No matches for "${query}"${where}.`,
    }
  }

  const counts: Array<[number, string]> = []
  if (searchedNodes) counts.push([nodeCount, 'node'])
  if (searchedEdges) counts.push([edgeCount, 'edge'])

  const phrases = counts.map(([count, noun]) => plural(count, noun))
  return {
    label: phrases.join(' · '),
    compactLabel: counts.map(([count]) => String(count)).join(' · '),
    sentence: `${phrases.join(' and ')} selected${where}.`,
  }
}
