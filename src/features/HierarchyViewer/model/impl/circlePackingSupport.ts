import TableFn, { Table } from '../../../../models/TableModel'

/**
 * Name of the edge attribute that carries the relationship type in CX2.
 */
export const EDGE_INTERACTION_ATTR = 'interaction'

/**
 * A HCX hierarchy may contain edges that are NOT parent-child relationships
 * (e.g. `activates`, `binds` between subsystems). The circle packing layout
 * treats every edge as a parent-child link, so those extra edges either break
 * the root lookup or silently produce a wrong nesting.
 *
 * The HCX spec does not yet mark which edges are hierarchy edges, so until it
 * does we use the interaction type as a proxy: a pure hierarchy has at most one
 * distinct interaction value.
 *
 * Null and undefined values are ignored, an absent `interaction` column counts
 * as uniform, and a missing table is treated as uniform so that a network whose
 * tables have not loaded yet is not reported as unsupported.
 *
 * @param edgeTable - edge table of the hierarchy
 *
 * @returns true when the hierarchy's edges can be used to build a tree
 */
export const hasUniformEdgeInteraction = (edgeTable?: Table): boolean =>
  edgeTable === undefined ||
  TableFn.columnValueSet(edgeTable, EDGE_INTERACTION_ATTR).size <= 1

/**
 * Warning added to the HCX validation result when the hierarchy mixes edge
 * types. It does not make the network invalid: such a hierarchy is still legal
 * HCX, it just cannot be rendered as a circle packing.
 */
export const MIXED_INTERACTION_WARNING =
  `The edges of this hierarchy have more than one '${EDGE_INTERACTION_ATTR}' value. ` +
  'Cell View (circle packing) is disabled because only parent-child edges can be used ' +
  'to build the hierarchy, and the HCX format does not yet mark which edges those are.'

/**
 * Shown in place of the circle packing diagram when the hierarchy cannot be
 * converted into a tree.
 */
export const CP_UNAVAILABLE_MESSAGE =
  'Cell View is not available for this hierarchy'

/**
 * Reason shown under {@link CP_UNAVAILABLE_MESSAGE} when the hierarchy does not
 * resolve to a single root.
 */
export const CP_NO_SINGLE_ROOT_MESSAGE =
  'The hierarchy could not be resolved to a single tree'
