export const CoreAspectTag = {
  Nodes: 'nodes',
  Edges: 'edges',
  NetworkAttributes: 'networkAttributes',
  AttributeDeclarations: 'attributeDeclarations',
  VisualProperties: 'visualProperties',
  MetaData: 'metaData',
  NodeBypasses: 'nodeBypasses',
  EdgeBypasses: 'edgeBypasses',
} as const

export type CoreAspectTag = typeof CoreAspectTag[keyof typeof CoreAspectTag]
