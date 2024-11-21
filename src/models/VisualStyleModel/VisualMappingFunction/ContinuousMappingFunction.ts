import { ValueType } from '../../TableModel'

import { VisualPropertyValueType } from '../VisualPropertyValue'
import { VisualMappingFunction } from '.'

export interface ContinuousFunctionControlPoint {
  value: ValueType
  vpValue: VisualPropertyValueType
  inclusive?: boolean
}

export interface ContinuousMappingFunction extends VisualMappingFunction {
  min: ContinuousFunctionControlPoint
  max: ContinuousFunctionControlPoint
  controlPoints: ContinuousFunctionControlPoint[]
  gtMaxVpValue: VisualPropertyValueType
  ltMinVpValue: VisualPropertyValueType
}
