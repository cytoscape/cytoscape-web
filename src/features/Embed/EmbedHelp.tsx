import { Box, Typography } from '@mui/material'
import { ReactElement, ReactNode, useContext } from 'react'

import { AppConfigContext } from '../../AppConfigContext'
import { EMBED_ROUTE_SEGMENT } from '../../data/db/dbScope'
import { ensureTrailingSlash } from '../../utils/baseUrl'
import { EMBED_PARAMS } from './embedParams'

const PARAMETERS: { name: string; effect: string }[] = [
  {
    name: EMBED_PARAMS.selectedNodes,
    effect:
      'Node IDs to select. In a hierarchy, the first ID that is a subsystem opens its interaction network, and the Cell View zooms to it.',
  },
  {
    name: EMBED_PARAMS.selectedEdges,
    effect: 'Edge IDs to select. Plain networks only.',
  },
  {
    name: EMBED_PARAMS.selectedSubnetworkNodes,
    effect: `Hierarchy only. Node IDs in the interaction network that ${EMBED_PARAMS.selectedNodes} opens, selected once it loads.`,
  },
  {
    name: EMBED_PARAMS.networkViewTab,
    effect:
      'Hierarchy only. The tab shown first: 0 Tree View, 1 Cell View. Default 1.',
  },
  {
    name: EMBED_PARAMS.accessKey,
    effect: "The network's NDEx share-link key, for an unlisted network.",
  },
]

const Code = ({ children }: { children: ReactNode }): ReactElement => (
  <Box
    component="pre"
    sx={{
      p: 1.5,
      overflowX: 'auto',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
      borderRadius: 1,
      backgroundColor: (theme) => theme.palette.action.hover,
    }}
  >
    <code>{children}</code>
  </Box>
)

const Heading = ({ children }: { children: ReactNode }): ReactElement => (
  <Typography variant="h6" component="h2" sx={{ mt: 3 }}>
    {children}
  </Typography>
)

/**
 * The page at `/embed/` with no network: how to build an embed URL, and the
 * query parameters it reads.
 */
export const EmbedHelp = (): ReactElement => {
  const { urlBaseName, maxEdgeCountThreshold, maxNetworkElementsThreshold } =
    useContext(AppConfigContext)
  const base = `${window.location.origin}${ensureTrailingSlash(urlBaseName)}${EMBED_ROUTE_SEGMENT}/`

  return (
    <Box
      data-testid="embed-help"
      sx={{
        height: '100vh',
        overflowY: 'auto',
        boxSizing: 'border-box',
        px: 2,
        py: 3,
        backgroundColor: (theme) => theme.palette.background.paper,
        color: (theme) => theme.palette.text.primary,
      }}
    >
      <Box sx={{ maxWidth: '48rem', mx: 'auto' }}>
        <Typography variant="h5" component="h1">
          Cytoscape Web embed
        </Typography>
        <p>
          Shows one NDEx network, read-only, on a page of its own or in an
          iframe. Hierarchies (HCX) show the Cell View and Tree View, with the
          selected subsystem&apos;s interaction network beside them.
        </p>

        <Heading>Address</Heading>
        <Code>{`${base}<network UUID>`}</Code>
        <p>The UUID is the network&apos;s NDEx UUID.</p>

        <Heading>Parameters</Heading>
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            '& th, & td': {
              textAlign: 'left',
              verticalAlign: 'top',
              p: 1,
              borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Effect</th>
            </tr>
          </thead>
          <tbody>
            {PARAMETERS.map(({ name, effect }) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>{effect}</td>
              </tr>
            ))}
          </tbody>
        </Box>
        <ul>
          <li>
            IDs are NDEx node and edge IDs, not names. Separate several with
            spaces, written <code>+</code> or <code>%20</code>.
          </li>
          <li>
            The names match Cytoscape Web&apos;s links, so a link copied from it
            works here with <code>/&lt;workspace&gt;/networks/</code> changed to{' '}
            <code>/{EMBED_ROUTE_SEGMENT}/</code>. Other parameters are ignored.
          </li>
          <li>
            <b>Open in Cytoscape Web</b> passes the current selection on as the
            same parameters.
          </li>
        </ul>

        <Heading>Example</Heading>
        <Code>{`${base}<hierarchy UUID>?${EMBED_PARAMS.selectedNodes}=74&${EMBED_PARAMS.selectedSubnetworkNodes}=616`}</Code>
        <p>
          Opens subsystem 74 of the hierarchy, zooms the Cell View to it, and
          selects node 616 in its interaction network.
        </p>

        <Heading>In an iframe</Heading>
        <Code>{`<iframe src="${base}<network UUID>" width="100%" height="600"></iframe>`}</Code>
        <p>The host page&apos;s domain must be allowed to frame this site.</p>

        <Heading>Limits</Heading>
        <ul>
          <li>
            Public networks, and unlisted ones with{' '}
            <code>{EMBED_PARAMS.accessKey}</code>. The embed does not sign in.
            Anyone who can read the page can read its access key.
          </li>
          <li>
            The same size limits as Cytoscape Web: up to{' '}
            {maxEdgeCountThreshold.toLocaleString()} edges, or fewer than{' '}
            {maxNetworkElementsThreshold.toLocaleString()} nodes and edges
            combined. A larger network shows a link to open it in Cytoscape Web.
          </li>
          <li>Read-only: nothing a visitor does changes the network.</li>
        </ul>
      </Box>
    </Box>
  )
}
