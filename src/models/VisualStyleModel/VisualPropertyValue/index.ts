import { ColorType } from './ColorType'
import { NodeShapeType } from './NodeShapeType'
import { EdgeLineType } from './EdgeLineType'
import { EdgeArrowShapeType } from './EdgeArrowShapeType'
import { FontType } from './FontType'
import {
  HoritzontalAlignType,
  VerticalAlignType,
} from './NodeLabelPositionType'
import { NodeBorderLineType } from './NodeBorderLineType'
import { VisibilityType } from './VisibilityType'

export type VisualPropertyValueType =
  | ColorType
  | NodeShapeType
  | EdgeLineType
  | EdgeArrowShapeType
  | FontType
  | HoritzontalAlignType
  | VerticalAlignType
  | NodeBorderLineType
  | VisibilityType
  | string
  | number
  | boolean

export { ColorType } from './ColorType'
export { NodeShapeType } from './NodeShapeType'
export { EdgeLineType } from './EdgeLineType'
export { EdgeArrowShapeType } from './EdgeArrowShapeType'
export { FontType } from './FontType'
export {
  HoritzontalAlignType,
  VerticalAlignType,
} from './NodeLabelPositionType'
export { NodeBorderLineType } from './NodeBorderLineType'
export { VisibilityType } from './VisibilityType'
