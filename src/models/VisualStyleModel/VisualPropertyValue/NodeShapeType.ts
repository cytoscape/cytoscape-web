export const NodeShapeType = {
  Rectangle: 'rectangle',
  Diamond: 'diamond',
  Ellipse: 'ellipse',
  Hexagon: 'hexagon',
  Octagon: 'octagon',
  Parallelogram: 'rhomboid',
  RoundRectangle: 'round-rectangle',
  Triangle: 'triangle',
  Vee: 'vee',
} as const

export type NodeShapeType = typeof NodeShapeType[keyof typeof NodeShapeType]
