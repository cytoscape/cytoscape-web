import * as React from 'react'
import { Box, Popover } from '@mui/material'

import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'
import { VisualPropertyValueTypeString } from '../../../models/VisualStyleModel/VisualPropertyValueTypeString'

import { NodeShape, NodeShapePicker } from '../VisualPropertyRender/NodeShape'
import { Color, ColorPicker } from '../VisualPropertyRender/Color'
import {
  NodeBorderLine,
  NodeBorderLinePicker,
} from '../VisualPropertyRender/NodeBorderLine'
import {
  NumberInput,
  Number as NumberRender,
} from '../VisualPropertyRender/Number'
import { Font, FontPicker } from '../VisualPropertyRender/Font'
import {
  HoritzontalAlignPicker,
  HorizontalAlign,
} from '../VisualPropertyRender/HorizontalAlign'
import {
  VerticalAlignPicker,
  VerticalAlign,
} from '../VisualPropertyRender/VerticalAlign'
import {
  Visibility,
  VisibilityPicker,
} from '../VisualPropertyRender/Visibility'
import {
  EdgeArrowShape,
  EdgeArrowShapePicker,
} from '../VisualPropertyRender/EdgeArrowShape'
import { EdgeLinePicker, EdgeLine } from '../VisualPropertyRender/EdgeLine'
import {
  StringInput,
  String as StringRender,
} from '../VisualPropertyRender/String'
import {
  BooleanSwitch,
  Boolean as BooleanRender,
} from '../VisualPropertyRender/Boolean'

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

interface VisualPropertyValueFormProps {
  visualProperty: VisualProperty<VisualPropertyValueType>
  currentValue: VisualPropertyValueType
  onValueChange: (newValue: VisualPropertyValueType) => void
}

// this component combines rendering vp values and a mechanism to mutate them via popover
export function VisualPropertyValueForm(
  props: VisualPropertyValueFormProps,
): React.ReactElement {
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
          '&:hover': { cursor: 'pointer' },
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
        anchorOrigin={{ vertical: 'top', horizontal: 55 }}
      >
        <Box>
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
