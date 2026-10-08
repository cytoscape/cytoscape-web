import type { ColorType } from './ColorType'
import type {
  CustomGraphicsPositionType,
  CustomGraphicsType,
} from './CustomGraphicsType'
import type { EdgeArrowShapeType } from './EdgeArrowShapeType'
import type { EdgeFillType } from './EdgeFillType'
import type { EdgeLineType } from './EdgeLineType'
import type { FontType } from './FontType'
import type { NodeBorderLineType } from './NodeBorderLineType'
import type {
  HorizontalAlignType,
  NodeLabelPositionType,
  VerticalAlignType,
} from './NodeLabelPositionType'
import type { NodeShapeType } from './NodeShapeType'
import type { VisibilityType } from './VisibilityType'

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
