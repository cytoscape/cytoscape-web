import { ReactElement, useContext } from 'react'
import { useParams, useRouteError } from 'react-router-dom'

import { AppConfigContext } from '../../AppConfigContext'
import { logUi } from '../../debug'
import { buildShareUrl } from '../FloatingToolBar/shareUrl'
import { EmbedMessage } from './EmbedMessage'

/**
 * Error element of the embed route. The editor's error page navigates to
 * `/error` and offers to reset the workspace; inside a frame the error stays
 * in place, with a link to open the network in the editor instead.
 *
 * Imported eagerly by the router, so it stays light: no stores, no viewer.
 */
export const EmbedErrorElement = (): ReactElement => {
  const error = useRouteError()
  const { networkId } = useParams()
  const { urlBaseName } = useContext(AppConfigContext)
  logUi.error('[Embed]: the embed failed', error)

  return (
    <EmbedMessage
      title="Something went wrong"
      detail="The network could not be shown here."
      linkOutUrl={
        networkId === undefined
          ? undefined
          : buildShareUrl(window.location.origin, urlBaseName, networkId, '')
      }
    />
  )
}
