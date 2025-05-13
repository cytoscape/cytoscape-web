import { ColorType } from './ColorType'
import {
  CustomGraphicsPositionType,
  CustomGraphicsType,
} from './CustomGraphicsType'
import { EdgeArrowShapeType } from './EdgeArrowShapeType'
import { EdgeFillType } from './EdgeFillType'
import { EdgeLineType } from './EdgeLineType'
import { FontType } from './FontType'
import { NodeBorderLineType } from './NodeBorderLineType'
import {
  HorizontalAlignType,
  NodeLabelPositionType,
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
  | HorizontalAlignType
  | VerticalAlignType
  | NodeBorderLineType
  | VisibilityType
  | NodeLabelPositionType
  | EdgeFillType
  | CustomGraphicsType
  | CustomGraphicsPositionType
  | string
  | number
  | boolean
