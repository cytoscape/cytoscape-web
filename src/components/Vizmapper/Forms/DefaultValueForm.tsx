import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'
import { IdType } from '../../../models/IdType'

import { useVisualStyleStore } from '../../../store/VisualStyleStore'

import { VisualPropertyValueForm } from './VisualPropertyValueForm'

export function DefaultValueForm(props: {
  visualProperty: VisualProperty<VisualPropertyValueType>
  currentNetworkId: IdType
}): React.ReactElement {
  const { visualProperty, currentNetworkId } = props
  const setDefault = useVisualStyleStore((state) => state.setDefault)

  return (
    <VisualPropertyValueForm
      visualProperty={visualProperty}
      currentValue={visualProperty.defaultValue}
      onValueChange={(newValue) =>
        setDefault(currentNetworkId, visualProperty.name, newValue)
      }
    />
  )
}
