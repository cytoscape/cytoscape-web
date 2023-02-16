import { ColorType } from './ColorType'
import { EdgeArrowShapeType } from './EdgeArrowShapeType'
import { EdgeLineType } from './EdgeLineType'
import { FontType } from './FontType'
import { NodeBorderLineType } from './NodeBorderLineType'
import {
  HoritzontalAlignType,
  VerticalAlignType,
} from './NodeLabelPositionType'
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
  | HoritzontalAlignType
  | VerticalAlignType
  | NodeBorderLineType
  | VisibilityType
  | string
  | number
  | boolean
