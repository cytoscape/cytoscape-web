import {
  Box,
  Divider,
  Popover,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import * as React from 'react'

import { IdType } from '../../../models/IdType'
import {
  EdgeVisualPropertyName,
  VisualProperty,
  VisualPropertyName,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'
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
} from '../VisualPropertyRender/CustomGraphic'
import {
  EdgeArrowShape,
  EdgeArrowShapePicker,
} from '../VisualPropertyRender/EdgeArrowShape'
import { EdgeLine,EdgeLinePicker } from '../VisualPropertyRender/EdgeLine'
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

const vpType2RenderMap: Record<
  VisualPropertyValueTypeName,
  {
    pickerRender: (props: {
      currentValue: VisualPropertyValueType | null
      onValueChange: (newValue: VisualPropertyValueType) => void
      closePopover: (reason: string) => void
      currentNetworkId?: IdType
      showCheckbox?: boolean
      vpName?: VisualPropertyName
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
  nodeImageChart1: {
    pickerRender: CustomGraphicPicker,
    valueRender: CustomGraphicRender,
  },
  nodeImageChart2: {
    pickerRender: CustomGraphicPicker,
    valueRender: CustomGraphicRender,
  },
  nodeImageChart3: {
    pickerRender: CustomGraphicPicker,
    valueRender: CustomGraphicRender,
  },
  nodeImageChart4: {
    pickerRender: CustomGraphicPicker,
    valueRender: CustomGraphicRender,
  },
  nodeImageChart5: {
    pickerRender: CustomGraphicPicker,
    valueRender: CustomGraphicRender,
  },

  nodeImageChart6: {
    pickerRender: CustomGraphicPicker,
    valueRender: CustomGraphicRender,
  },

  nodeImageChart7: {
    pickerRender: CustomGraphicPicker,
    valueRender: CustomGraphicRender,
  },
  nodeImageChart8: {
    pickerRender: CustomGraphicPicker,
    valueRender: CustomGraphicRender,
  },
  nodeImageChart9: {
    pickerRender: CustomGraphicPicker,
    valueRender: CustomGraphicRender,
  },
  // image chart position and size properties will currently be hidden in the vizmapper and uneditable
  // in the future if these properties are supported in the cy.js renderer we can add them here
  // and implement the picker and value render functions
  nodeImageChartPosition1: {
    pickerRender: () => <></>,
    valueRender: () => <></>,
  },
  nodeImageChartPosition2: {
    pickerRender: () => <></>,
    valueRender: () => <></>,
  },
  nodeImageChartPosition3: {
    pickerRender: () => <></>,
    valueRender: () => <></>,
  },
  nodeImageChartPosition4: {
    pickerRender: () => <></>,
    valueRender: () => <></>,
  },
  nodeImageChartPosition5: {
    pickerRender: () => <></>,
    valueRender: () => <></>,
  },
  nodeImageChartPosition6: {
    pickerRender: () => <></>,
    valueRender: () => <></>,
  },
  nodeImageChartPosition7: {
    pickerRender: () => <></>,
    valueRender: () => <></>,
  },
  nodeImageChartPosition8: {
    pickerRender: () => <></>,
    valueRender: () => <></>,
  },
  nodeImageChartPosition9: {
    pickerRender: () => <></>,
    valueRender: () => <></>,
  },
  nodeImageChartSize1: {
    pickerRender: NumberInput,
    valueRender: NumberRender,
  },
  nodeImageChartSize2: {
    pickerRender: NumberInput,
    valueRender: NumberRender,
  },
  nodeImageChartSize3: {
    pickerRender: NumberInput,
    valueRender: NumberRender,
  },
  nodeImageChartSize4: {
    pickerRender: NumberInput,
    valueRender: NumberRender,
  },
  nodeImageChartSize5: {
    pickerRender: NumberInput,
    valueRender: NumberRender,
  },
  nodeImageChartSize6: {
    pickerRender: NumberInput,
    valueRender: NumberRender,
  },
  nodeImageChartSize7: {
    pickerRender: NumberInput,
    valueRender: NumberRender,
  },
  nodeImageChartSize8: {
    pickerRender: NumberInput,
    valueRender: NumberRender,
  },
  nodeImageChartSize9: {
    pickerRender: NumberInput,
    valueRender: NumberRender,
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
        closePopover: (reason: string) => void
        currentNetworkId?: IdType
        showCheckbox?: boolean
        vpName?: VisualPropertyName
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

  const closePopover = (
    reason: 'backdropClick' | 'escapeKeyDown' | 'confirm' | 'cancel',
  ): void => {
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
            vpName={props.visualProperty.name}
            value={props.currentValue}
            vpValueType={props.visualProperty.type}
          />
        </Box>
      </Tooltip>

      <Popover
        open={valuePicker != null}
        anchorEl={valuePicker}
        disableEscapeKeyDown={true}
        hideBackdrop={true}
        onClose={(e: any, reason: 'backdropClick' | 'escapeKeyDown') =>
          closePopover(reason)
        }
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
