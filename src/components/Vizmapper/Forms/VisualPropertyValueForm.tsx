import * as React from 'react'
import { Box, Popover, Typography, Tooltip } from '@mui/material'

import {
  VisualProperty,
  VisualPropertyValueType,
  VisualPropertyName,
} from '../../../models/VisualStyleModel'

import { NodeShape, NodeShapePicker } from '../VisualPropertyRender/NodeShape'
import { Color, ColorPicker } from '../VisualPropertyRender/Color'
import {
  NodeBorderLine,
  NodeBorderLinePicker,
} from '../VisualPropertyRender/NodeBorderLine'
import { NumberInput, NumberRender } from '../VisualPropertyRender/Number'
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
  OpacitySlider,
  Opacity as OpacityRender,
} from '../VisualPropertyRender/Opacity'

import {
  EmptyVisualPropertyViewBox,
  VisualPropertyViewBox,
} from './VisualPropertyViewBox'
import { VisualPropertyValueTypeName } from '../../../models/VisualStyleModel/VisualPropertyValueTypeName'

const vpType2RenderMap: Record<
  VisualPropertyValueTypeName,
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

// in some cases, we have specialized value renders
// e.g. opacity needs to be rendered as 0% -> 100% instead of 0.0 to 1.0
// another example is label rotation which will be rendered in angles
const vpName2RenderMap: Partial<
  Record<
    VisualPropertyName,
    {
      pickerRender: (props: {
        currentValue: VisualPropertyValueType | null
        onValueChange: (newValue: VisualPropertyValueType) => void
      }) => React.ReactElement
      valueRender: (props: {
        value: VisualPropertyValueType
      }) => React.ReactElement
    }
  >
> = {
  nodeBorderOpacity: {
    pickerRender: OpacitySlider,
    valueRender: OpacityRender,
  },
  nodeLabelOpacity: {
    pickerRender: OpacitySlider,
    valueRender: OpacityRender,
  },
  nodeOpacity: {
    pickerRender: OpacitySlider,
    valueRender: OpacityRender,
  },
  edgeOpacity: {
    pickerRender: OpacitySlider,
    valueRender: OpacityRender,
  },
  edgeLabelOpacity: {
    pickerRender: OpacitySlider,
    valueRender: OpacityRender,
  },
}

interface VisualPropertyRenderProps {
  value: VisualPropertyValueType | null
  vpValueType: VisualPropertyValueTypeName
  vpName: VisualPropertyName
}

export function VisualPropertyValueRender(
  props: VisualPropertyRenderProps,
): React.ReactElement {
  if (props.value == null) {
    return <EmptyVisualPropertyViewBox />
  }

  // check if the vpname has a special render function
  // if it does, use that instead of the default value render
  const vpNameRender = vpName2RenderMap[props.vpName]?.valueRender
  if (vpNameRender != null) {
    return (
      <VisualPropertyViewBox>
        {vpNameRender({
          value: props.value,
        })}
      </VisualPropertyViewBox>
    )
  }

  // if not, use the default render for the vp type
  return (
    <VisualPropertyViewBox>
      {vpType2RenderMap[props.vpValueType].valueRender({
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

  if (
    vpType2RenderMap[props.visualProperty.type] == null &&
    vpName2RenderMap[props.visualProperty.name] == null
  ) {
    return <Box></Box>
  }

  return (
    <Box>
      <Tooltip title={props.tooltipText}>
        <Box onClick={(e) => showValuePicker(e.currentTarget)}>
          <VisualPropertyValueRender
            vpName={props.visualProperty.name}
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
            <Typography sx={{ m: 1 }}>{props.title}</Typography>
          ) : null}

          <Box sx={{ p: 1 }}>
            {(
              vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
              vpType2RenderMap[props.visualProperty.type].pickerRender ??
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
