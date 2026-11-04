import { Core } from 'cytoscape'
import { useEffect, useMemo, useRef, useState } from 'react'

import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import { NetworkSummary } from '@/models/NetworkSummaryModel'

import { CyView, FIT_PADDING } from './CyView'
import { Drawing } from './drawing'
import { NodeAttributes } from './NodeAttributes'
import { highlightNodes } from './searchHighlight'
import { searchNodes } from './searchNodes'
import { Toolbar } from './Toolbar'

const SEARCH_DEBOUNCE_MS = 200

interface NetworkCanvasProps {
  networkId: IdType
  summary: NetworkSummary
  cyNetwork: CyNetwork
  /** The network's drawing, built in the prepare worker. */
  drawing: Drawing
  /** Nodes selected on load, from the URL. */
  initialSelectedNodeIds: readonly IdType[]
}

/** Viewer for a plain network: toolbar with search, the network, and the clicked node's attributes. */
export const NetworkCanvas = ({
  networkId,
  summary,
  cyNetwork,
  drawing,
  initialSelectedNodeIds,
}: NetworkCanvasProps) => {
  const cyRef = useRef<Core | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<IdType | undefined>(
    () =>
      initialSelectedNodeIds.length === 1
        ? initialSelectedNodeIds[0]
        : undefined,
  )
  const [query, setQuery] = useState('')
  const [matchCount, setMatchCount] = useState<number | undefined>()
  const searchedRef = useRef(false)

  const defaultLayout = useMemo(
    () =>
      summary.hasLayout
        ? undefined
        : { networkId: summary.externalId, isHierarchical: false },
    [summary],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      const cy = cyRef.current
      if (cy === null) return
      if (query.trim() === '') {
        highlightNodes(cy, [], FIT_PADDING)
        // Clearing a search zooms back out; the first run on mount does not.
        if (searchedRef.current) cy.fit(undefined, FIT_PADDING)
        searchedRef.current = false
        setMatchCount(undefined)
        return
      }
      searchedRef.current = true
      const ids = searchNodes(cyNetwork.nodeTable, query)
      highlightNodes(cy, ids, FIT_PADDING)
      setMatchCount(ids.length)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, cyNetwork])

  const selectedRow =
    selectedNodeId === undefined
      ? undefined
      : cyNetwork.nodeTable.rows.get(selectedNodeId)

  return (
    <div className="embed-viewer">
      <CyView
        cyNetwork={cyNetwork}
        drawing={drawing}
        annotationsFrom={summary}
        defaultLayout={defaultLayout}
        selectedNodeIds={initialSelectedNodeIds}
        onNodeTap={setSelectedNodeId}
        onReady={(cy) => {
          cyRef.current = cy
        }}
        exposeForCompare
      />
      <Toolbar networkId={networkId} name={summary.name}>
        <label className="embed-paper embed-search">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search nodes"
            aria-label="Search nodes"
            data-testid="embed-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {matchCount !== undefined && (
            <span
              className="embed-search-count"
              data-testid="embed-search-count"
            >
              {matchCount === 0
                ? 'No matches'
                : `${matchCount} match${matchCount === 1 ? '' : 'es'}`}
            </span>
          )}
        </label>
      </Toolbar>
      {selectedRow !== undefined && <NodeAttributes row={selectedRow} />}
    </div>
  )
}
