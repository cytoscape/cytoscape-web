import { SxProps, Box } from '@mui/material'

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
  sx?: SxProps
}): React.ReactElement {
  const { visualProperty, currentNetworkId } = props
  const setDefault = useVisualStyleStore((state) => state.setDefault)

  return (
    <Box sx={props.sx ?? {}}>
      <VisualPropertyValueForm
        title={`Default ${visualProperty.displayName}`}
        tooltipText={`Default ${visualProperty.displayName}`}
        visualProperty={visualProperty}
        currentValue={visualProperty.defaultValue}
        onValueChange={(newValue) =>
          setDefault(currentNetworkId, visualProperty.name, newValue)
        }
      />
    </Box>
  )
}
