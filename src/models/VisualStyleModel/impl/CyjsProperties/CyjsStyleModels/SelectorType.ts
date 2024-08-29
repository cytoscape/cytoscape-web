/**
 * Cytoscape.js selector type.
 *
 * All styles will be applied to all nodes or edges
 * @see https://js.cytoscape.org/#selectors
 *
 */
export const SelectorType = { Node: 'node', Edge: 'edge' } as const

export type SelectorType = (typeof SelectorType)[keyof typeof SelectorType]
