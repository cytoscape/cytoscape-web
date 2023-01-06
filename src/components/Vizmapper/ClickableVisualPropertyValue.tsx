import * as React from 'react'
import { Box, Popover } from '@mui/material'

import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../models/VisualStyleModel'
import { VisualPropertyValueTypeString } from '../../models/VisualStyleModel/VisualPropertyValueTypeString'

import { NodeShape, NodeShapePicker } from './NodeShape'
import { Color, ColorPicker } from './Color'
import { NodeBorderLine, NodeBorderLinePicker } from './NodeBorderLine'
import { NumberInput, Number as NumberRender } from './Number'
import { Font, FontPicker } from './Font'
import { HoritzontalAlignPicker, HorizontalAlign } from './HorizontalAlign'
import { VerticalAlignPicker, VerticalAlign } from './VerticalAlign'
import { Visibility, VisibilityPicker } from './Visibility'
import { EdgeArrowShape, EdgeArrowShapePicker } from './EdgeArrowShape'
import { EdgeLinePicker, EdgeLine } from './EdgeLine'
import { StringInput, String as StringRender } from './String'
import { BooleanSwitch, Boolean as BooleanRender } from './Boolean'

const type2RenderFnMap: Record<
  VisualPropertyValueTypeString,
  {
    pickerRender: (props: {
      currentValue: VisualPropertyValueType
      onValueChange: (newValue: VisualPropertyValueType) => void
    }) => React.ReactElement
    valueRender: (props: {
      value: VisualPropertyValueType
    }) => React.ReactElement
  }
> = {
  nodeShape: {
    pickerRender: NodeShapePicker,
    valueRender: NodeShape,
  },
  color: {
    pickerRender: ColorPicker,
    valueRender: Color,
  },
  nodeBorderLine: {
    pickerRender: NodeBorderLinePicker,
    valueRender: NodeBorderLine,
  },
  number: {
    pickerRender: NumberInput,
    valueRender: NumberRender,
  },
  font: {
    pickerRender: FontPicker,
    valueRender: Font,
  },
  horizontalALign: {
    pickerRender: HoritzontalAlignPicker,
    valueRender: HorizontalAlign,
  },
  verticalAlign: {
    pickerRender: VerticalAlignPicker,
    valueRender: VerticalAlign,
  },
  visibility: {
    pickerRender: VisibilityPicker,
    valueRender: Visibility,
  },
  edgeArrowShape: {
    pickerRender: EdgeArrowShapePicker,
    valueRender: EdgeArrowShape,
  },
  edgeLine: {
    pickerRender: EdgeLinePicker,
    valueRender: EdgeLine,
  },
  string: {
    pickerRender: StringInput,
    valueRender: StringRender,
  },
  boolean: {
    pickerRender: BooleanSwitch,
    valueRender: BooleanRender,
  },
}

export function ClickableVisualPropertyValue(props: {
  visualProperty: VisualProperty<VisualPropertyValueType>
  currentValue: VisualPropertyValueType
  onValueChange: (newValue: VisualPropertyValueType) => void
}): React.ReactElement {
  const [valuePicker, setValuePicker] = React.useState<Element | null>(null)

  const showValuePicker = (value: Element | null): void => {
    setValuePicker(value)
  }

  if (type2RenderFnMap[props.visualProperty.type] == null) {
    return <Box></Box>
  }

  return (
    <Box>
      <Box
        sx={{
          p: 1,
          m: 1,
          '&:hover': { border: '1px solid gray', cursor: 'pointer' },
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
        onClick={(e) => showValuePicker(e.currentTarget)}
      >
        {type2RenderFnMap[props.visualProperty.type].valueRender({
          value: props.currentValue,
        })}
      </Box>
      <Popover
        open={valuePicker != null}
        anchorEl={valuePicker}
        onClose={() => showValuePicker(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, m: 1 }}>
          {(
            type2RenderFnMap[props.visualProperty.type].pickerRender ??
            (() => {})
          )({
            onValueChange: (value: VisualPropertyValueType) =>
              props.onValueChange(value),
            currentValue: props.currentValue,
          })}
        </Box>
      </Popover>
    </Box>
  )
}
