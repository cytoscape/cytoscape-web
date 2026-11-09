import config from '@/assets/config.json'
import { ensureTrailingSlash } from '@/utils/baseUrl'

import { EMBED_MAX_ELEMENTS } from './loadEmbedNetwork'
import { EMBED_PARAMS } from './readSelectionFromSearch'

/** `<origin><base>embed/`, the address every embed URL starts with. */
const embedBaseUrl = (): string =>
  `${window.location.origin}${ensureTrailingSlash(config.urlBaseName)}embed/`

const PARAMETERS: { name: string; effect: string }[] = [
  {
    name: EMBED_PARAMS.selectedNodes,
    effect:
      'Node IDs to select. In a network, selects them; one ID also shows its attributes. In a hierarchy, the first ID that is a subsystem opens its interaction network, and the Cell View zooms to it.',
  },
  {
    name: EMBED_PARAMS.selectedSubnetworkNodes,
    effect: `Hierarchy only. Node IDs in the interaction network that ${EMBED_PARAMS.selectedNodes} opens, selected once it loads. Their circles in the Cell View get a red ring.`,
  },
  {
    name: EMBED_PARAMS.networkViewTab,
    effect:
      'Hierarchy only. The tab shown first: 0 Hierarchy, 1 Cell View. Default 1.',
  },
]

/**
 * The page at `/embed/` with no network: how to build an embed URL, and
 * the query parameters it reads.
 */
export const EmbedHelp = () => {
  const base = embedBaseUrl()
  return (
    <div className="embed-help" data-testid="embed-help">
      <article className="embed-paper embed-help-body">
        <h1>Cytoscape Web embed</h1>
        <p>
          Shows one public NDEx network, read-only, on a page of its own or in
          an iframe. Hierarchies (HCX) show the Cell View and the hierarchy
          network, with the selected subsystem&apos;s interaction network beside
          them.
        </p>

        <h2>Address</h2>
        <pre>
          <code>{`${base}<network UUID>`}</code>
        </pre>
        <p>The UUID is the network&apos;s NDEx UUID.</p>

        <h2>Parameters</h2>
        <table>
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
        </table>
        <ul>
          <li>
            IDs are NDEx node IDs, not names. Separate several with spaces,
            written <code>+</code> or <code>%20</code>.
          </li>
          <li>
            The names match the full app&apos;s links, so a link copied from
            Cytoscape Web works here with{' '}
            <code>/&lt;workspace&gt;/networks/</code> changed to{' '}
            <code>/embed/</code>. The embed ignores the full app&apos;s other
            parameters.
          </li>
          <li>
            <b>Open in Cytoscape Web</b> passes the current selection on as the
            same parameters.
          </li>
        </ul>

        <h2>Example</h2>
        <pre>
          <code>{`${base}<hierarchy UUID>?${EMBED_PARAMS.selectedNodes}=74&${EMBED_PARAMS.selectedSubnetworkNodes}=616`}</code>
        </pre>
        <p>
          Opens subsystem 74 of the hierarchy, zooms the Cell View to it, and
          selects node 616 in its interaction network.
        </p>

        <h2>In an iframe</h2>
        <pre>
          <code>{`<iframe src="${base}<network UUID>" width="100%" height="600"></iframe>`}</code>
        </pre>
        <p>The host page&apos;s domain must be allowed to frame this site.</p>

        <h2>Limits</h2>
        <ul>
          <li>Public networks only: the embed does not sign in.</li>
          <li>
            Up to {EMBED_MAX_ELEMENTS.toLocaleString()} nodes and edges. A
            larger network shows a link to open it in Cytoscape Web.
          </li>
        </ul>
      </article>
    </div>
  )
}
