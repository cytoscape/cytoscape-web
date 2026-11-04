import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getNDExBaseUrl } from '@/data/external-api/ndex/config'
import { logApi } from '@/debug'
import { CirclePackingView } from '@/features/HierarchyViewer/model/CirclePackingView'
import { HcxMetaData } from '@/features/HierarchyViewer/model/HcxMetaData'
import { getSubsystemName } from '@/features/HierarchyViewer/utils/subsystemName'
import { Cx2 } from '@/models/CxModel/Cx2'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import { NetworkSummary } from '@/models/NetworkSummaryModel'

import { CyView } from '../CyView'
import { EmbedSelection } from '../readSelectionFromSearch'
import { Toolbar } from '../Toolbar'
import { buildCellView } from './buildCellView'
import { CellView } from './CellView'
import {
  fetchSubsystemCx2,
  loadSubsystem,
  Subsystem,
  subsystemRequest,
} from './loadSubsystem'
import { SubsystemPane } from './SubsystemPane'

type Tab = 'cell' | 'tree'

type Loadable<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; value: T }

/** Subsystem requests kept, hovered or loaded, newest last. */
const MAX_CACHED_REQUESTS = 4

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

interface HcxViewerProps {
  networkId: IdType
  summary: NetworkSummary
  hierarchy: CyNetwork
  metadata: HcxMetaData
  /**
   * Selection from the URL: the first id in `nodeIds` that is a subsystem
   * opens it, and `subnetworkNodeIds` are selected in its network.
   */
  initialSelection: EmbedSelection
}

/**
 * Viewer for an HCX hierarchy: Cell View and the hierarchy network as tabs
 * on the left, the selected subsystem's interaction network on the right.
 * A subsystem selected in either left view is selected in both; nodes
 * selected in the subsystem view outline their leaf circles.
 */
export const HcxViewer = ({
  networkId,
  summary,
  hierarchy,
  metadata,
  initialSelection,
}: HcxViewerProps) => {
  const ndexUrl =
    metadata.interactionNetworkHost !== undefined &&
    metadata.interactionNetworkHost !== ''
      ? metadata.interactionNetworkHost
      : getNDExBaseUrl()
  const rootNetworkId = metadata.interactionNetworkUUID

  const [tab, setTab] = useState<Tab>('cell')
  const [cellView, setCellView] = useState<Loadable<CirclePackingView>>({
    kind: 'loading',
  })
  const [subsystemId, setSubsystemId] = useState<IdType | undefined>(() =>
    initialSelection.nodeIds.find((id) => hierarchy.nodeTable.rows.has(id)),
  )
  const [subsystem, setSubsystem] = useState<Loadable<Subsystem>>({
    kind: 'idle',
  })
  const [selectedSubNodeIds, setSelectedSubNodeIds] = useState<IdType[]>([])
  // A leaf clicked in the Cell View before its subsystem has loaded
  const pendingLeafNameRef = useRef<string | undefined>()
  // Subsystem nodes from the URL, selected when the first subsystem loads
  const pendingSubNodeIdsRef = useRef<readonly IdType[]>(
    initialSelection.subnetworkNodeIds,
  )

  useEffect(() => {
    let cancelled = false
    setCellView({ kind: 'loading' })
    buildCellView(hierarchy, rootNetworkId, ndexUrl)
      .then((value) => {
        if (!cancelled) setCellView({ kind: 'ready', value })
      })
      .catch((error: unknown) => {
        logApi.warn('[embed] Cell View failed', error)
        if (!cancelled)
          setCellView({ kind: 'failed', message: messageOf(error) })
      })
    return () => {
      cancelled = true
    }
  }, [hierarchy, rootNetworkId, ndexUrl])

  // Requests started by a hover or a selection, so a click on a hovered
  // subsystem finds its network already downloading or downloaded
  const requestsRef = useRef(new Map<IdType, Promise<Cx2>>())
  const requestCx2 = useCallback(
    (id: IdType): Promise<Cx2> | undefined => {
      const requests = requestsRef.current
      const cached = requests.get(id)
      if (cached !== undefined) {
        // Newest last
        requests.delete(id)
        requests.set(id, cached)
        return cached
      }
      const source = subsystemRequest(hierarchy.nodeTable, id, rootNetworkId)
      if (source === undefined) return undefined
      const request = fetchSubsystemCx2(source, ndexUrl)
      // A failed request is retried on the next hover or click
      request.catch(() => requests.delete(id))
      requests.set(id, request)
      if (requests.size > MAX_CACHED_REQUESTS) {
        requests.delete(requests.keys().next().value as IdType)
      }
      return request
    },
    [hierarchy, rootNetworkId, ndexUrl],
  )

  useEffect(() => {
    if (subsystemId === undefined || cellView.kind !== 'ready') {
      setSubsystem({ kind: 'idle' })
      return
    }
    let cancelled = false
    setSubsystem({ kind: 'loading' })
    const request = requestCx2(subsystemId)
    if (request === undefined) {
      setSubsystem({
        kind: 'failed',
        message: 'This subsystem has no interaction network.',
      })
      return
    }
    request
      .then((cx2) => {
        if (cancelled) return
        const value = loadSubsystem({
          hierarchyId: networkId,
          subsystemId,
          cx2,
          cellView: cellView.value,
        })
        setSubsystem({ kind: 'ready', value })
        const leafName = pendingLeafNameRef.current
        const urlNodeIds = pendingSubNodeIdsRef.current
        pendingLeafNameRef.current = undefined
        pendingSubNodeIdsRef.current = []
        setSelectedSubNodeIds(
          leafName !== undefined
            ? nodesNamed(value, leafName)
            : urlNodeIds.filter((id) => value.cyNetwork.nodeTable.rows.has(id)),
        )
      })
      .catch((error: unknown) => {
        logApi.warn(`[embed] subsystem ${subsystemId} failed`, error)
        if (!cancelled)
          setSubsystem({ kind: 'failed', message: messageOf(error) })
      })
    return () => {
      cancelled = true
    }
  }, [subsystemId, cellView, networkId, requestCx2])

  const selectSubsystem = (id: IdType | undefined): void => {
    if (id === subsystemId) return
    setSelectedSubNodeIds([])
    setSubsystemId(id)
  }

  const selectLeaf = (leafName: string, parentId: IdType): void => {
    if (parentId !== subsystemId) {
      pendingLeafNameRef.current = leafName
      setSubsystemId(parentId)
      return
    }
    if (subsystem.kind === 'ready') {
      setSelectedSubNodeIds(nodesNamed(subsystem.value, leafName))
    }
  }

  const highlightedLeafNames = useMemo(() => {
    const names = new Set<string>()
    if (subsystem.kind !== 'ready') return names
    selectedSubNodeIds.forEach((id) => {
      const name = subsystem.value.cyNetwork.nodeTable.rows.get(id)?.name
      if (typeof name === 'string') names.add(name)
    })
    return names
  }, [subsystem, selectedSubNodeIds])

  const treeSelection = useMemo(
    () => (subsystemId === undefined ? [] : [subsystemId]),
    [subsystemId],
  )
  const treeLayout = useMemo(
    () => (summary.hasLayout ? undefined : { networkId, isHierarchical: true }),
    [summary, networkId],
  )

  const subsystemName =
    subsystemId === undefined
      ? undefined
      : getSubsystemName(
          hierarchy.nodeTable.rows.get(subsystemId) ?? {},
          hierarchy.visualStyle.nodeLabel?.mapping?.attribute,
          subsystemId,
        )

  return (
    <div className="embed-viewer embed-hcx" data-testid="embed-hcx">
      <Toolbar networkId={networkId} name={summary.name} />
      <div className="embed-hcx-body">
        <section className="embed-pane">
          <div className="embed-pane-header" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'cell'}
              className="embed-tab"
              data-testid="embed-tab-cell"
              onClick={() => setTab('cell')}
            >
              Cell View
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'tree'}
              className="embed-tab"
              data-testid="embed-tab-tree"
              onClick={() => setTab('tree')}
            >
              Hierarchy
            </button>
          </div>
          <div className="embed-pane-body">
            {tab === 'cell' &&
              (cellView.kind === 'ready' ? (
                <CellView
                  cellView={cellView.value}
                  selectedSubsystemId={subsystemId}
                  highlightedLeafNames={highlightedLeafNames}
                  onSelectSubsystem={selectSubsystem}
                  onHoverSubsystem={(id) => void requestCx2(id)}
                  onSelectLeaf={selectLeaf}
                />
              ) : (
                <PaneMessage
                  text={
                    cellView.kind === 'failed'
                      ? `Cell View is not available: ${cellView.message}`
                      : 'Building Cell View…'
                  }
                />
              ))}
            {tab === 'tree' && (
              <CyView
                cyNetwork={hierarchy}
                annotationsFrom={summary}
                defaultLayout={treeLayout}
                selectedNodeIds={treeSelection}
                onNodeTap={selectSubsystem}
                exposeForCompare
                testId="embed-tree-canvas"
              />
            )}
          </div>
        </section>
        <section className="embed-pane">
          <div className="embed-pane-header" data-testid="embed-subsystem-name">
            {subsystemName ?? 'Subsystem'}
          </div>
          <div className="embed-pane-body">
            {subsystem.kind === 'ready' ? (
              <SubsystemPane
                key={subsystemId}
                subsystem={subsystem.value}
                selectedNodeIds={selectedSubNodeIds}
                onSelectNode={(id) =>
                  setSelectedSubNodeIds(id === undefined ? [] : [id])
                }
              />
            ) : (
              <PaneMessage
                text={
                  subsystem.kind === 'loading'
                    ? 'Loading interactions…'
                    : subsystem.kind === 'failed'
                      ? `Could not load this subsystem: ${subsystem.message}`
                      : 'Select a subsystem to see its interactions.'
                }
              />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

const PaneMessage = ({ text }: { text: string }) => (
  <div className="embed-message" data-testid="embed-pane-message">
    <div className="embed-message-detail">{text}</div>
  </div>
)

const nodesNamed = (subsystem: Subsystem, name: string): IdType[] => {
  const ids: IdType[] = []
  subsystem.cyNetwork.nodeTable.rows.forEach((row, id) => {
    if (row.name === name) ids.push(id)
  })
  return ids
}
