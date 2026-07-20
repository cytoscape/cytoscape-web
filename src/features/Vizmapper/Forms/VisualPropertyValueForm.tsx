import { Box, Divider, Popover, Tooltip } from '@mui/material'
import * as React from 'react'

import { IdType } from '../../../models/IdType'
import {
  EdgeVisualPropertyName,
  VisualProperty,
  VisualPropertyName,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'
import {
  CustomGraphicsType,
  CustomGraphicsTypeType,
} from '../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { VisualPropertyValueTypeName } from '../../../models/VisualStyleModel/VisualPropertyValueTypeName'
import {
  Boolean as BooleanRender,
  BooleanSwitch,
} from '../VisualPropertyRender/Boolean'
import { LockColorCheckbox } from '../VisualPropertyRender/Checkbox'
import { Color, ColorPicker } from '../VisualPropertyRender/Color'
import {
  CustomGraphicPicker,
  CustomGraphicRender,
} from '../VisualPropertyRender/CustomGraphics'
import {
  EdgeArrowShape,
  EdgeArrowShapePicker,
} from '../VisualPropertyRender/EdgeArrowShape'
import { EdgeLine, EdgeLinePicker } from '../VisualPropertyRender/EdgeLine'
import { Font, FontPicker } from '../VisualPropertyRender/Font'
import {
  HorizontalAlign,
  HorizontalAlignPicker,
} from '../VisualPropertyRender/HorizontalAlign'
import {
  NodeBorderLine,
  NodeBorderLinePicker,
} from '../VisualPropertyRender/NodeBorderLine'
import {
  NodeLabelPositionPicker,
  NodeLabelPositionRender,
} from '../VisualPropertyRender/NodeLabelPosition'
import { NodeShape, NodeShapePicker } from '../VisualPropertyRender/NodeShape'
import { NumberInput, NumberRender } from '../VisualPropertyRender/Number'
import {
  Opacity as OpacityRender,
  OpacitySlider,
} from '../VisualPropertyRender/Opacity'
import {
  String as StringRender,
  StringInput,
} from '../VisualPropertyRender/String'
import {
  VerticalAlign,
  VerticalAlignPicker,
} from '../VisualPropertyRender/VerticalAlign'
import {
  Visibility,
  VisibilityPicker,
} from '../VisualPropertyRender/Visibility'
import {
  EmptyVisualPropertyViewBox,
  VisualPropertyViewBox,
} from './VisualPropertyViewBox'

type VisualPropertyRenderers = {
  // This registry intentionally contains renderers with heterogeneous props;
  // the visual-property metadata selects the matching renderer at runtime.
  pickerRender: (props: any) => React.ReactElement
  valueRender: (props: any) => React.ReactElement
}

const vpType2RenderMap: Record<
  VisualPropertyValueTypeName,
  VisualPropertyRenderers
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
  [VisualPropertyValueTypeName.HorizontalAlign]: {
    pickerRender: HorizontalAlignPicker,
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
  nodeLabelPosition: {
    pickerRender: NodeLabelPositionPicker,
    valueRender: NodeLabelPositionRender,
  },
  customGraphic: {
    pickerRender: CustomGraphicPicker,
    valueRender: CustomGraphicRender,
  },
  customGraphicPosition: {
    pickerRender: () => <></>,
    valueRender: () => <></>,
  },
}

// in some cases, we have specialized value renders
// e.g. opacity needs to be rendered as 0% -> 100% instead of 0.0 to 1.0
// another example is label rotation which will be rendered in angles
const vpName2RenderMap: Partial<
  Record<VisualPropertyName, VisualPropertyRenderers>
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
  if (props.vpName.includes('nodeImageChart')) {
    const customGraphic = props.value as CustomGraphicsType
    if (
      customGraphic?.type === CustomGraphicsTypeType.None ||
      customGraphic == null
    ) {
      return <EmptyVisualPropertyViewBox />
    }
  }
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
  currentNetworkId: IdType
  showCheckbox?: boolean
  title?: string
  tooltipText?: string
}

// this component combines rendering vp values and a mechanism to mutate them via popover
export function VisualPropertyValueForm(
  props: VisualPropertyValueFormProps,
): React.ReactElement {
  const [valuePicker, setValuePicker] = React.useState<Element | null>(null)
  const vpName = props.visualProperty.name
  const isEdgeLineColor =
    vpName === EdgeVisualPropertyName.EdgeLineColor ||
    vpName === EdgeVisualPropertyName.EdgeTargetArrowColor ||
    vpName === EdgeVisualPropertyName.EdgeSourceArrowColor
  const showValuePicker = (value: Element | null): void => {
    setValuePicker(value)
  }

  const closePopover = (): void => {
    setValuePicker(null)
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
            key={`${props.visualProperty.name}-${
              props.currentValue
                ? (props.currentValue as any)?.name || 'null'
                : 'null'
            }`}
            vpName={props.visualProperty.name}
            value={props.currentValue}
            vpValueType={props.visualProperty.type}
          />
        </Box>
      </Tooltip>

      <Popover
        data-testid="visual-property-value-picker-popover"
        open={valuePicker != null}
        anchorEl={valuePicker}
        disableEscapeKeyDown={true}
        hideBackdrop={true}
        onClose={() => closePopover()}
        anchorOrigin={{ vertical: 'top', horizontal: 55 }}
      >
        <Box sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              margin: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {(
              vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
              vpType2RenderMap[props.visualProperty.type]?.pickerRender ??
              (() => {})
            )({
              onValueChange: (value: VisualPropertyValueType) =>
                props.onValueChange(value),
              currentValue: props.currentValue,
              currentNetworkId: props.currentNetworkId,
              showCheckbox: props.showCheckbox ?? false,
              vpName: props.visualProperty.name,
              closePopover: closePopover,
            })}
          </Box>
          {props.showCheckbox && isEdgeLineColor && (
            <Box sx={{ pl: 2 }}>
              <Divider />
              <LockColorCheckbox currentNetworkId={props.currentNetworkId} />
            </Box>
          )}
        </Box>
      </Popover>
    </Box>
  )
}
