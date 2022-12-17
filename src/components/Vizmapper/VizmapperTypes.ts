import { VisualPropertyValueType } from '../../models/VisualStyleModel'
export interface ChangeableVisualPropertyProps {
  currentValue: VisualPropertyValueType
  onValueChange: (value: VisualPropertyValueType) => void
}
