import { LayoutAlgorithm, LayoutAlgorithmType } from '../../../LayoutAlgorithm'

export const cosmos: LayoutAlgorithm = {
  name: 'cosmos',
  engineName: 'Cosmos',
  displayName: 'Cosmos Layout (GPU-based, nondeterministic)',
  description:
    'Cosmos Layout: GPU-powered force-directed layout (nondeterministic, best for large graphs)',
  type: LayoutAlgorithmType.force,
  parameters: {
    linkArrows: false,
    linkColor: (link: any) => link.color,
    nodeColor: (node: any) => node.color,
    simulation: {
      linkSpring: 0.1,
      linkDistance: 15,
      repulsion: 2.0,
      gravity: 0.3,
    },
    events: {
      onClick: () => {},
    },
  },
  // Known gap (pre-existing): these names live under `parameters.simulation`,
  // not at the top level, and cosmosLayout.ts reads the static algorithm
  // rather than the one passed in, so edits made in Layout Settings do not
  // reach the engine. setLayoutOption refuses to write a key that is not
  // already in `parameters`, which keeps a stray top-level key from being
  // created. Flattening `simulation.*` is a follow-up.
  editables: [
    {
      name: 'linkSpring',
      displayName: 'Link Spring',
      description: 'The spring constant of the links',
      type: 'text',
      validationType: 'number',
      defaultValue: 0.1,
    },
    {
      name: 'linkDistance',
      displayName: 'Link Distance',
      description: 'The distance of the links',
      type: 'text',
      validationType: 'number',
      defaultValue: 15,
    },
    {
      name: 'repulsion',
      displayName: 'Repulsion',
      description: 'The repulsion of the nodes',
      type: 'text',
      validationType: 'number',
      defaultValue: 2.0,
    },
    {
      name: 'gravity',
      displayName: 'Gravity',
      description: 'The gravity of the nodes',
      type: 'text',
      validationType: 'number',
      defaultValue: 0.3,
    },
  ],
}
