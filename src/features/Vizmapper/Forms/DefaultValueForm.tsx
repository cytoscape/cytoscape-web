import { Box, SxProps } from '@mui/material'

import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useUndoStack } from '../../../data/hooks/useUndoStack'
import { IdType } from '../../../models/IdType'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'
import { VisualPropertyValueForm } from './VisualPropertyValueForm'

export function DefaultValueForm(props: {
  visualProperty: VisualProperty<VisualPropertyValueType>
  currentNetworkId: IdType
  sx?: SxProps
}): React.ReactElement {
  const { visualProperty, currentNetworkId } = props
  const setDefault = useVisualStyleStore((state) => state.setDefault)
  const { postEdit } = useUndoStack()

  return (
    <Box sx={props.sx ?? {}}>
      <VisualPropertyValueForm
        title={`Default ${visualProperty.displayName}`}
        visualProperty={visualProperty}
        currentValue={visualProperty.defaultValue}
        currentNetworkId={currentNetworkId}
        showCheckbox={true}
        onValueChange={(newValue) => {
          setDefault(currentNetworkId, visualProperty.name, newValue)
          postEdit(
            UndoCommandType.SET_DEFAULT_VP_VALUE,
            `Set default ${visualProperty.displayName}`,
            [
              currentNetworkId,
              visualProperty.name,
              visualProperty.defaultValue,
            ],
            [currentNetworkId, visualProperty.name, newValue],
          )
        }}
      />
    </Box>
  )
}
