export const EdgeArrowShapeType = {
  Triangle: 'triangle',
  Circle: 'circle',
  Diamond: 'diamond',
  Square: 'square',
  Tee: 'tee',
  Arrow: 'arrow',
  OpenCircle: 'open_circle',
  OpenDiamond: 'open_diamond',
  OpenSquare: 'open_square',
  OpenDelta: 'open_delta',
  None: 'none',
} as const

export type EdgeArrowShapeType =
  (typeof EdgeArrowShapeType)[keyof typeof EdgeArrowShapeType]
