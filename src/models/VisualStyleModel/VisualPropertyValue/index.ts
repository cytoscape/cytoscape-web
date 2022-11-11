import { Color } from './Color'
import { NodeShapeType } from './NodeShapeType'
import { EdgeLineType } from './EdgeLineType'
import { EdgeArrowShapeType } from './EdgeArrowShapeType'
import { FontType } from './FontType'
import { NodeLabelPositionType } from './NodeLabelPositionType'
import { NodeBorderLineType } from './NodeBorderLineType'
import { VisibilityType } from './VisibilityType'

export type VisualPropertyValueType =
  | Color
  | NodeShapeType
  | EdgeLineType
  | EdgeArrowShapeType
  | FontType
  | NodeLabelPositionType
  | NodeBorderLineType
  | VisibilityType
  | string
  | number
  | boolean

export { Color } from './Color'
export { NodeShapeType } from './NodeShapeType'
export { EdgeLineType } from './EdgeLineType'
export { EdgeArrowShapeType } from './EdgeArrowShapeType'
export { FontType } from './FontType'
export { NodeLabelPositionType } from './NodeLabelPositionType'
export { NodeBorderLineType } from './NodeBorderLineType'
export { VisibilityType } from './VisibilityType'
