/**
 * Available discrete values for the visual-property types that support a
 * continuous (step-function) mapping (CW-569). Used to seed a new
 * continuous-discrete mapping and to populate the editor's value pickers.
 */
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { EdgeArrowShapeType } from '../VisualPropertyValue/EdgeArrowShapeType'
import { EdgeLineType } from '../VisualPropertyValue/EdgeLineType'
import { NodeBorderLineType } from '../VisualPropertyValue/NodeBorderLineType'
import { NodeShapeType } from '../VisualPropertyValue/NodeShapeType'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'

export const getDiscreteVpValues = (
  vpType: VisualPropertyValueTypeName,
): VisualPropertyValueType[] => {
  switch (vpType) {
    case VisualPropertyValueTypeName.EdgeLine:
      return Object.values(EdgeLineType)
    case VisualPropertyValueTypeName.NodeBorderLine:
      return Object.values(NodeBorderLineType)
    case VisualPropertyValueTypeName.NodeShape:
      return Object.values(NodeShapeType)
    case VisualPropertyValueTypeName.EdgeArrowShape:
      return Object.values(EdgeArrowShapeType)
    default:
      return []
  }
}
