export const CoreAspectTag = {
  Nodes: 'nodes',
  Edges: 'edges',
  NetworkAttributes: 'networkAttributes',
  AttributeDeclaration: 'attributeDeclaration',
  VisualProperties: 'visualProperties',
  MetaData: 'metaData',
} as const

export type CoreAspectTag = typeof CoreAspectTag[keyof typeof CoreAspectTag]
