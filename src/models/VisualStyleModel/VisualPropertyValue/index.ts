import { Color } from './Color'
import { Position } from './Position'
import { NodeShapeType } from './NodeShapeType'
import { EdgeLineType } from './EdgeLineType'
import { EdgeArrowShapeType } from './EdgeArrowShapeType'
import { FontType } from './FontType'

export type VisualPropertyValueType =
  | Color
  | Position
  | NodeShapeType
  | EdgeLineType
  | EdgeArrowShapeType
  | FontType
  | string
  | number
  | boolean

export { Color } from './Color'
export { Position } from './Position'
export { NodeShapeType } from './NodeShapeType'
export { EdgeLineType } from './EdgeLineType'
export { EdgeArrowShapeType } from './EdgeArrowShapeType'
export { FontType } from './FontType'
export { NodeLabelPositionType } from './NodeLabelPositionType'
