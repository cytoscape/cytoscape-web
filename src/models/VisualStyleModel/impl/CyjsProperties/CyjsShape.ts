/**
 * Node shape names available in Cytoscape.js
 * as an array of string literals
 */
export const CyjsNodeShapeNames = [
  'ellipse',
  'triangle',
  'round-triangle',
  'rectangle',
  'round-rectangle',
  'bottom-round-rectangle',
  'cut-rectangle',
  'barrel',
  'rhomboid',
  'diamond',
  'round-diamond',
  'pentagon',
  'round-pentagon',
  'hexagon',
  'round-hexagon',
  'concave-hexagon',
  'heptagon',
  'round-heptagon',
  'octagon',
  'round-octagon',
  'star',
  'tag',
  'round-tag',
  'vee',
  'polygon',
] as const

export const CyjsNodeShapeTags: string[] = CyjsNodeShapeNames.map((shape) =>
  toCamelCase(shape),
)

export type CyjsNodeShapeType = typeof CyjsNodeShapeNames[number]
export type CyjsNodeShapeTagType = typeof CyjsNodeShapeTags[number]

const toCamelCase = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase()
    })
    .replace(/[-]+/g, '')
}

/**
 * And object literal created from type and string array above
 */
export const CyjsNodeShapeTypeObj = CyjsNodeShapeNames.reduce(
  (obj: Record<CyjsNodeShapeTagType, CyjsNodeShapeType>, shape) => {
    obj[toCamelCase(shape)] = shape
    return obj
  },
  {} as const,
)

const newShape: Record<CyjsNodeShapeTagType, CyjsNodeShapeType> = {
  ...CyjsNodeShapeTypeObj,
} as const
export type CyjsNodeShapeType2 = typeof newShape[keyof typeof newShape]
