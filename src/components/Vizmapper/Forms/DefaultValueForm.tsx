import { SxProps, Box } from '@mui/material'

import {
  NodeVisualPropertyNames,
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
  const vpName = visualProperty.name
  const setDefault = useVisualStyleStore((state) => state.setDefault)
  let syncValue = (newValue: VisualPropertyValueType) => { }
  if (vpName === NodeVisualPropertyNames.nodeHeight) {
    syncValue = (newValue) =>
      setDefault(currentNetworkId, NodeVisualPropertyNames.nodeWidth, newValue)
  } else if (vpName === NodeVisualPropertyNames.nodeWidth) {
    syncValue = (newValue) =>
      setDefault(currentNetworkId, NodeVisualPropertyNames.nodeHeight, newValue)
  }
  return (
    <Box sx={props.sx ?? {}}>
      <VisualPropertyValueForm
        title={`Default ${visualProperty.displayName}`}
        visualProperty={visualProperty}
        currentValue={visualProperty.defaultValue}
        onValueChange={(newValue) =>
          setDefault(currentNetworkId, visualProperty.name, newValue)
        }
        syncValue={syncValue}
      />
    </Box>
  )
}
