/**
 * Biological Flow Layout — contributed by Nodes Bio
 *
 * A hierarchical layout optimized for biological pathway visualization:
 * - Topological sort assigns columns (left→right signal flow)
 * - Barycenter heuristic minimizes edge crossings
 * - Handles cycles via DFS back-edge removal
 *
 * This is a client-side port of the LayoutOptimizer algorithm
 * originally developed for the MedMap pathway visualization tool.
 *
 * @see https://github.com/cytoscape/cytoscape-web/issues/XXX
 */
import { LayoutAlgorithm } from '../../..'
import { LayoutAlgorithmType } from '../../../LayoutAlgorithm'

export const biologicalFlow: LayoutAlgorithm = {
  name: 'biological-flow',
  engineName: 'Cytoscape.js',
  displayName: 'Biological Flow Layout',
  type: LayoutAlgorithmType.hierarchical,
  description:
    'Layered layout with left-to-right biological signal flow direction. ' +
    'Uses topological sort for layer assignment and barycenter heuristic ' +
    'for crossing minimization. Handles cycles gracefully.',
  parameters: {
    name: 'preset', // Uses preset because positions are pre-computed
    fit: true,
    padding: 80,
    animate: false,
  },
  editables: {},
}
