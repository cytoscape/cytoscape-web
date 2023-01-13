import * as React from 'react'
import { Box, Popover, Typography, Tooltip } from '@mui/material'

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

import {
  EmptyVisualPropertyViewBox,
  VisualPropertyViewBox,
} from './VisualPropertyViewBox'

const type2RenderFnMap: Record<
  VisualPropertyValueTypeString,
  {
    pickerRender: (props: {
      currentValue: VisualPropertyValueType | null
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
  horizontalAlign: {
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

interface VisualPropertyRenderProps {
  value: VisualPropertyValueType | null
  vpValueType: VisualPropertyValueTypeString
}

export function VisualPropertyValueRender(
  props: VisualPropertyRenderProps,
): React.ReactElement {
  if (props.value == null) {
    return <EmptyVisualPropertyViewBox />
  }
  return (
    <VisualPropertyViewBox>
      {type2RenderFnMap[props.vpValueType].valueRender({
        value: props.value,
      })}
    </VisualPropertyViewBox>
  )
}

interface VisualPropertyValueFormProps {
  visualProperty: VisualProperty<VisualPropertyValueType>
  currentValue: VisualPropertyValueType | null
  onValueChange: (newValue: VisualPropertyValueType) => void
  title?: string
  tooltipText?: string
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
      <Tooltip title={props.tooltipText}>
        <Box onClick={(e) => showValuePicker(e.currentTarget)}>
          <VisualPropertyValueRender
            value={props.currentValue}
            vpValueType={props.visualProperty.type}
          />
        </Box>
      </Tooltip>

      <Popover
        open={valuePicker != null}
        anchorEl={valuePicker}
        onClose={() => showValuePicker(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 55 }}
      >
        <Box>
          {props.title != null ? (
            <Typography sx={{ m: 1 }} variant="h6">
              {props.title}
            </Typography>
          ) : null}

          <Box sx={{ p: 1 }}>
            {(
              type2RenderFnMap[props.visualProperty.type].pickerRender ??
              (() => {})
            )({
              onValueChange: (value: VisualPropertyValueType) =>
                props.onValueChange(value),
              currentValue: props.currentValue,
            })}
          </Box>
        </Box>
      </Popover>
    </Box>
  )
}
