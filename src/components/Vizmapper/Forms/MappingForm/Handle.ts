import { ValueType } from '../../../../models/TableModel'
import { ContinuousFunctionControlPoint } from '../../../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'
import { VisualPropertyValueType } from '../../../../models/VisualStyleModel'

export interface Handle extends ContinuousFunctionControlPoint {
  id: number
  value: ValueType
  vpValue: VisualPropertyValueType
  pixelPosition: { x: number; y: number }
}
