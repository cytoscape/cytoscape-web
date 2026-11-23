/**
 * What "Open Network in Cytoscape Desktop" needs on the user's machine.
 *
 * The open posts CX2 to core CyREST (`POST /v1/networks?format=cx2`, via
 * `CyNDEx.postCX2NetworkToCytoscape` in `@js4cytoscape/ndex-client`); the
 * CyNDEx-2 app is not involved. That endpoint reads CX2 through the CX Support
 * core app, which first registered a CX2 reader in CX Support 2.8.0. Cytoscape
 * Desktop 3.10.0 is the first release that bundles it; 3.9 ships CX Support
 * 2.7.0, which cannot read CX2.
 *
 * Every message that states the requirement uses these constants, so they
 * cannot drift apart again (#844).
 */
export const CYTOSCAPE_DESKTOP_REQUIREMENT =
  'Cytoscape Desktop 3.10 or later running on your machine (default port 1234), with the CX Support app up to date'

/** Shown when Cytoscape Desktop is unreachable or the open fails. */
export const CYTOSCAPE_DESKTOP_UNAVAILABLE_MESSAGE = `To use this feature, you need ${CYTOSCAPE_DESKTOP_REQUIREMENT}.`
