/**
 * BACKUP FILE - Layout GPU Implementation
 *
 * This is a backup of gForce.ts that uses @antv/layout-gpu for layout calculations.
 *
 * Created: 2024-11-04
 * Purpose: Backup before switching to @antv/g6 package approach
 *
 * To restore this version, copy this file back to gForce.ts
 */

import { ValueTypeName } from '../../../../TableModel'
import { LayoutAlgorithm, LayoutAlgorithmType } from '../../../LayoutAlgorithm'

export const gForce: LayoutAlgorithm = {
  name: 'gForce',
  engineName: 'G6',
  displayName: 'gForce Layout (GPU-based force-directed)',
  description: 'Force-directed layout with GPU acceleration',
  type: LayoutAlgorithmType.force,
  parameters: {
    type: 'gForce',
    // Core layout parameters (matching G6's successful values)
    linkDistance: 200, // Matches G6's working value
    nodeStrength: 650, // Matches G6's working value
    edgeStrength: 50, // Matches G6's working value
    maxIteration: 400, // Matches G6's working value
    // Layout dimensions (matching G6 container size for consistency)
    width: 4000,
    height: 4000,
    // Advanced force parameters (for fine-tuning layout quality)
    coulombDisScale: 0.005, // Controls repulsion strength
    damping: 0.9, // Velocity damping (0-1, higher = more stable)
    maxSpeed: 1000, // Maximum node velocity
    minMovement: 0.5, // Minimum movement threshold
    interval: 0.02, // Simulation time step
    factor: 1, // General force scaling factor
    gravity: 10, // Gravitational force toward center
    // Legacy/compatibility parameters (not used by GForceLayout but kept for compatibility)
    nodeSize: 350,
    onTick: () => {},
    onLayoutEnd: () => {},
    preventOverlap: true,
    workerEnabled: true,
    gpuEnabled: true,
  },
  editables: {
    preventOverlap: {
      name: 'preventOverlap',
      description: 'Avoid overlapping nodes',
      type: ValueTypeName.Boolean,
      value: true,
      defaultValue: true,
    },
    gpuEnabled: {
      name: 'gpuEnabled',
      description: 'Whether to activate GPU acceleration',
      type: ValueTypeName.Boolean,
      value: true,
      defaultValue: true,
    },
    linkDistance: {
      name: 'linkDistance',
      description: 'The ideal edge length',
      type: ValueTypeName.Integer,
      value: 200,
      defaultValue: 200,
    },
    nodeStrength: {
      name: 'nodeStrength',
      description: 'The strength of node repulsion force',
      type: ValueTypeName.Integer,
      value: 650,
      defaultValue: 650,
    },
    edgeStrength: {
      name: 'edgeStrength',
      description: 'The strength of edge attraction force',
      type: ValueTypeName.Integer,
      value: 50,
      defaultValue: 50,
    },
    maxIteration: {
      name: 'maxIteration',
      description: 'Maximum number of iterations',
      type: ValueTypeName.Integer,
      value: 400,
      defaultValue: 400,
    },
    gravity: {
      name: 'gravity',
      description: 'Gravitational force pulling nodes toward center',
      type: ValueTypeName.Integer,
      value: 10,
      defaultValue: 10,
    },
    damping: {
      name: 'damping',
      description: 'Damping factor to reduce node velocity (0-1)',
      type: ValueTypeName.Double,
      value: 0.9,
      defaultValue: 0.9,
    },
    coulombDisScale: {
      name: 'coulombDisScale',
      description:
        'Coulomb force scale - higher values increase repulsion and reduce overlap',
      type: ValueTypeName.Double,
      value: 0.005,
      defaultValue: 0.005,
    },
  },
}
