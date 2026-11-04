import { lazy, Suspense, useEffect, useState } from 'react'

import { logApi } from '@/debug'
import { getHcxMetadata } from '@/features/HierarchyViewer/utils/hierarchyUtil'
import { IdType } from '@/models/IdType'

import {
  EMBED_MAX_ELEMENTS,
  EmbedNetworkResult,
  loadEmbedNetwork,
} from './loadEmbedNetwork'
import { MessageView } from './MessageView'
import { NetworkCanvas } from './NetworkCanvas'
import { EmbedSelection } from './readSelectionFromSearch'

interface EmbedAppProps {
  networkId: IdType | undefined
  /** Selection from the URL, applied once the network loads. */
  initialSelection: EmbedSelection
}

type LoadState = { kind: 'loading' } | EmbedNetworkResult

// HCX code (D3, the Cell View) loads only for hierarchies
const HcxViewer = lazy(() =>
  import('./hcx/HcxViewer').then((m) => ({ default: m.HcxViewer })),
)

/** Root of the embeddable viewer: loads one NDEx network and draws it. */
export const EmbedApp = ({ networkId, initialSelection }: EmbedAppProps) => {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    if (networkId === undefined) return
    let cancelled = false
    setState({ kind: 'loading' })
    void loadEmbedNetwork(networkId).then((result) => {
      if (result.kind === 'unreachable' || result.kind === 'invalid') {
        logApi.warn(`[embed] ${result.kind}: ${networkId}`, result.message)
      }
      if (!cancelled) setState(result)
    })
    return () => {
      cancelled = true
    }
  }, [networkId])

  if (networkId === undefined) {
    return (
      <MessageView
        title="No network to show"
        detail="The embed URL needs an NDEx network UUID: /embed/<uuid>."
      />
    )
  }
  switch (state.kind) {
    case 'loading':
      return <MessageView title="Loading network…" testId="embed-loading" />
    case 'not-found':
      return (
        <MessageView
          title="Network not found"
          detail="NDEx has no public network with this UUID."
        />
      )
    case 'too-large':
      return (
        <MessageView
          title={`${state.summary.name} is too large to show here`}
          detail={`It has ${(state.summary.nodeCount + state.summary.edgeCount).toLocaleString()} nodes and edges; the embed shows up to ${EMBED_MAX_ELEMENTS.toLocaleString()}.`}
          networkId={networkId}
        />
      )
    case 'unreachable':
      return (
        <MessageView
          title="Could not reach NDEx"
          detail="Check the connection and reload."
          networkId={networkId}
        />
      )
    case 'invalid':
      return (
        <MessageView
          title={`${state.summary.name} could not be read`}
          detail={state.message}
          networkId={networkId}
        />
      )
    case 'loaded': {
      const metadata = getHcxMetadata(state.summary)
      if (metadata?.interactionNetworkUUID !== undefined) {
        return (
          <Suspense
            fallback={
              <MessageView title="Loading network…" testId="embed-loading" />
            }
          >
            <HcxViewer
              networkId={networkId}
              summary={state.summary}
              hierarchy={state.cyNetwork}
              metadata={metadata}
              initialSelection={initialSelection}
            />
          </Suspense>
        )
      }
      return (
        <NetworkCanvas
          networkId={networkId}
          summary={state.summary}
          cyNetwork={state.cyNetwork}
          initialSelectedNodeIds={initialSelection.nodeIds}
        />
      )
    }
  }
}
