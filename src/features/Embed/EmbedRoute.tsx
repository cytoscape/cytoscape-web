import { ReactElement, useContext, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { AppConfigContext } from '../../AppConfigContext'
import {
  EmbedStatus,
  runEmbedBoot,
  statusOf,
} from '../../boot/steps/runEmbedBoot'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { logUi } from '../../debug'
import { IdType } from '../../models/IdType'
import { ReadOnlyContext } from '../../ReadOnlyContext'
import { buildShareUrl } from '../FloatingToolBar/shareUrl'
import { isHCX } from '../HierarchyViewer/utils/hierarchyUtil'
import { useLoadNetworkIntoStores } from '../Workspace/useLoadNetworkIntoStores'
import { applyEmbedSelection } from './applyEmbedSelection'
import { EmbedHelp } from './EmbedHelp'
import { EmbedMessage } from './EmbedMessage'
import { readEmbedParams } from './embedParams'
import { EmbedViewer } from './EmbedViewer'

/**
 * Maps a failed network load to a status: a request that failed is
 * "unreachable", anything else (a CX2 the converter or validator rejects) is
 * "invalid", with its message.
 */
const statusForLoadError = (error: unknown, name: string): EmbedStatus =>
  statusOf(error) !== undefined || error instanceof TypeError
    ? { kind: 'unreachable' }
    : {
        kind: 'invalid',
        name,
        message:
          error instanceof Error && error.message !== ''
            ? error.message
            : 'Unknown error',
      }

const EmbedNetwork = ({ networkId }: { networkId: IdType }): ReactElement => {
  // Read once: the embed never changes its own URL
  const [params] = useState(() => readEmbedParams(window.location.search))
  const [status, setStatus] = useState<EmbedStatus>({ kind: 'loading' })
  const config = useContext(AppConfigContext)
  const loadNetworkIntoStores = useLoadNetworkIntoStores()

  const startedRef = useRef(false)
  useEffect(() => {
    // Once, StrictMode's second run included, as AppShell's boot
    if (startedRef.current) {
      return
    }
    startedRef.current = true

    const start = async (): Promise<void> => {
      const resolved = await runEmbedBoot({
        networkId,
        accessKey: params.accessKey,
        limits: config,
      })
      if (resolved.kind !== 'ready') {
        setStatus(resolved)
        return
      }
      try {
        await loadNetworkIntoStores(networkId, () => false)
      } catch (error) {
        logUi.error(`[Embed]: failed to load network ${networkId}`, error)
        setStatus(statusForLoadError(error, resolved.summary.name))
        return
      }
      useUiStateStore.getState().setActiveNetworkView(networkId)
      applyEmbedSelection(networkId, params, isHCX(resolved.summary))
      setStatus(resolved)
    }
    void start()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref-guarded run-once boot; the route remounts for another network
  }, [])

  const bareLinkOut = buildShareUrl(
    window.location.origin,
    config.urlBaseName,
    networkId,
    params.accessKey === undefined
      ? ''
      : new URLSearchParams({ accesskey: params.accessKey }).toString(),
  )

  switch (status.kind) {
    case 'loading':
      return <EmbedMessage title="Loading network…" showProgress />
    case 'not-found':
      return (
        <EmbedMessage
          title="Network not found"
          detail="NDEx has no public network with this UUID."
        />
      )
    case 'key-rejected':
      return (
        <EmbedMessage
          title="Network not available"
          detail="The share link for this network is off or has changed."
        />
      )
    case 'too-large':
      return (
        <EmbedMessage
          title={`${status.name} is too large to show here`}
          detail={`It has ${status.elementCount.toLocaleString()} nodes and edges.`}
          linkOutUrl={bareLinkOut}
        />
      )
    case 'unreachable':
      return (
        <EmbedMessage
          title="Could not reach NDEx"
          detail="Check the connection and reload."
          linkOutUrl={bareLinkOut}
        />
      )
    case 'invalid':
      return (
        <EmbedMessage
          title={`${status.name} could not be read`}
          detail={status.message}
          linkOutUrl={bareLinkOut}
        />
      )
    case 'ready':
      return (
        <EmbedViewer
          networkId={networkId}
          summary={status.summary}
          params={params}
        />
      )
  }
}

/**
 * Route element of `/embed/:networkId?` (EMBED_MODE_SPECIFICATION.md): one
 * NDEx network, read-only, for an iframe on someone else's page. With no
 * network id it shows how to build an embed URL.
 */
const EmbedRoute = (): ReactElement => {
  const { networkId } = useParams()
  if (networkId === undefined || networkId === '') {
    return <EmbedHelp />
  }
  return (
    <ReadOnlyContext.Provider value={true}>
      <EmbedNetwork key={networkId} networkId={networkId} />
    </ReadOnlyContext.Provider>
  )
}

export default EmbedRoute
