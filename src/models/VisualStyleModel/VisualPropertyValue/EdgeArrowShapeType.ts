export const EdgeArrowShapeType = {
  Triangle: 'triangle',
  Circle: 'circle',
  Diamond: 'diamond',
  Square: 'square',
  Tee: 'tee',
} as const

export type EdgeArrowShapeType =
  typeof EdgeArrowShapeType[keyof typeof EdgeArrowShapeType]
