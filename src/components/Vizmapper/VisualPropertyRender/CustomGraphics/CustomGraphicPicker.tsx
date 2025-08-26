import * as React from 'react'
import { IdType } from '../../../../models/IdType'
import { CustomGraphicsType } from '../../../../models/VisualStyleModel'

import { CustomGraphicDialog } from './CustomGraphicDialog'

/** Inline adapter for VisualPropertyValueForm with feature flag */
export function CustomGraphicPicker(props: {
  currentValue: CustomGraphicsType | null
  onValueChange: (v: CustomGraphicsType) => void
  closePopover: (reason: string) => void
  currentNetworkId: IdType
}): React.ReactElement {
  const { currentValue, onValueChange, closePopover, currentNetworkId } = props

  return (
    <CustomGraphicDialog
      open={true}
      currentNetworkId={currentNetworkId}
      initialValue={currentValue}
      onCancel={() => {
        closePopover('cancel')
      }}
      onConfirm={(v) => {
        onValueChange(v)
        closePopover('confirm')
      }}
    />
  )
}
