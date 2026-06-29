/**
 * Biological Flow Layout — powered by cytoscape-biological-flow
 *
 * A hierarchical layout optimized for biological pathway visualization:
 * - Left-to-right signal flow direction
 * - Barycenter heuristic minimizes edge crossings
 * - Handles cycles via DFS back-edge removal
 *
 * Contributed by Nodes Bio (https://nodes.bio)
 *
 * @see https://github.com/jmg421/cytoscape-biological-flow
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
    name: 'biological-flow',
    fit: true,
    padding: 80,
    animate: false,
  },
  editables: {},
}
