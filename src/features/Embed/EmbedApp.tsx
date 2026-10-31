import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { CyjsRenderer } from '../NetworkPanel/CyjsRenderer'
import { useLoadCyNetwork } from '../../data/hooks/useLoadCyNetwork'
import { setHydrating } from '../../data/hooks/stores/hydrationContext'

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useOpaqueAspectStore } from '../../data/hooks/stores/OpaqueAspectStore'
import { useUndoStore } from '../../data/hooks/stores/UndoStore'

export default function EmbedApp() {
  const { networkId } = useParams<{ networkId: string }>()
  const loadCyNetwork = useLoadCyNetwork()

  const addNetwork = useNetworkStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )
  const addAllOpaqueAspects = useOpaqueAspectStore((state) => state.addAll)
  const addStack = useUndoStore((state) => state.addStack)

  const [network, setNetwork] = useState<any>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!networkId) {
        setError('No network ID was provided.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(undefined)
        const data = await loadCyNetwork(networkId)

        if (cancelled) return

        const {
          network: loadedNetwork,
          nodeTable,
          edgeTable,
          visualStyle,
          visualStyleSet,
          networkViews,
          visualStyleOptions,
          otherAspects,
          undoRedoStack,
        } = data

        // Prevent the initial store hydration from being persisted.
        setHydrating(true)
        try {
          setVisualStyleOptions(networkId, visualStyleOptions)
          addNetwork(loadedNetwork)
          addVisualStyle(networkId, visualStyle, visualStyleSet)
          addTable(networkId, nodeTable, edgeTable)

          if (networkViews.length > 0) {
            addViewModel(networkId, networkViews[0])
          }

          if (otherAspects !== undefined) {
            addAllOpaqueAspects(networkId, otherAspects)
          }

          addStack(networkId, undoRedoStack)
        } finally {
          setHydrating(false)
        }

        if (!cancelled) {
          setNetwork(loadedNetwork)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load this network.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [
    networkId,
    loadCyNetwork,
    setVisualStyleOptions,
    addNetwork,
    addVisualStyle,
    addTable,
    addViewModel,
    addAllOpaqueAspects,
    addStack,
  ])

  if (loading) {
    return <div style={{ padding: 24 }}>Loading network…</div>
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Unable to display network</h2>
        <p>{error}</p>
        <a href={import.meta.env.BASE_URL}>Open Cytoscape Web</a>
      </div>
    )
  }

  if (!network) {
    return <div style={{ padding: 24 }}>Network not found.</div>
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
        }}
      >
        <a
          href={import.meta.env.BASE_URL}
          title="Open the full Cytoscape Web application"
          aria-label="Open the full Cytoscape Web application"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 8,
            background: '#fff',
            color: '#222',
            border: '1px solid #ddd',
            textDecoration: 'none',
            fontSize: 20,
          }}
        >
          ↗
        </a>
      </div>

      <CyjsRenderer network={network} readOnly />
    </div>
  )
}
