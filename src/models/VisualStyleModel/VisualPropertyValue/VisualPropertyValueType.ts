import { ColorType } from './ColorType'
import { EdgeArrowShapeType } from './EdgeArrowShapeType'
import { EdgeLineType } from './EdgeLineType'
import { FontType } from './FontType'
import { NodeBorderLineType } from './NodeBorderLineType'
import { HorizontalAlignType, VerticalAlignType } from './NodeLabelPositionType'
import { NodeShapeType } from './NodeShapeType'
import { VisibilityType } from './VisibilityType'

/**
 * Supported visual property data types.
 */
export type VisualPropertyValueType =
  | ColorType
  | NodeShapeType
  | EdgeLineType
  | EdgeArrowShapeType
  | FontType
  | HorizontalAlignType
  | VerticalAlignType
  | NodeBorderLineType
  | VisibilityType
  | string
  | number
  | boolean
