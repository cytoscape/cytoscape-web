import * as React from 'react'
import { Box, Popover, Typography, Tooltip, Tabs, Tab, Divider } from '@mui/material'

import {
  VisualProperty,
  VisualPropertyValueType,
  VisualPropertyName,
  EdgeVisualPropertyName,
} from '../../../models/VisualStyleModel'

import { NodeShape, NodeShapePicker } from '../VisualPropertyRender/NodeShape'
import {
  Color,
  ColorPicker,
  ColorPickerCompact,
  ColorPickerViridis,
  ColorPickerSequential,
  ColorPickerDiverging,
} from '../VisualPropertyRender/Color'
import {
  NodeBorderLine,
  NodeBorderLinePicker,
} from '../VisualPropertyRender/NodeBorderLine'
import { NumberInput, NumberRender } from '../VisualPropertyRender/Number'
import { Font, FontPicker } from '../VisualPropertyRender/Font'
import {
  HorizontalAlignPicker,
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
import {
  NodeLabelPositionPicker,
  NodeLabelPositionRender,
} from '../VisualPropertyRender/NodeLabelPosition'
import { IdType } from '../../../models/IdType'
import { CheckBox } from '@mui/icons-material'
import { LockColorCheckbox } from '../VisualPropertyRender/Checkbox'

const vpType2RenderMap: Record<
  VisualPropertyValueTypeName,
  {
    pickerRender: (props: {
      currentValue: VisualPropertyValueType | null
      onValueChange: (newValue: VisualPropertyValueType) => void
      closePopover: () => void
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
}

const vpType2RenderMap2: Record<
  VisualPropertyValueTypeName,
  {
    pickerRender: (props: {
      currentValue: VisualPropertyValueType | null
      onValueChange: (newValue: VisualPropertyValueType) => void
      closePopover: () => void
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
    pickerRender: ColorPickerCompact,
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
}
const vpType2RenderMapViridis: Record<
  VisualPropertyValueTypeName,
  {
    pickerRender: (props: {
      currentValue: VisualPropertyValueType | null
      onValueChange: (newValue: VisualPropertyValueType) => void
      closePopover: () => void
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
    pickerRender: ColorPickerViridis,
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
}

const vpType2RenderMapSequential: Record<
  VisualPropertyValueTypeName,
  {
    pickerRender: (props: {
      currentValue: VisualPropertyValueType | null
      onValueChange: (newValue: VisualPropertyValueType) => void
      closePopover: () => void
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
    pickerRender: ColorPickerSequential,
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
}

const vpType2RenderMapDiverging: Record<
  VisualPropertyValueTypeName,
  {
    pickerRender: (props: {
      currentValue: VisualPropertyValueType | null
      onValueChange: (newValue: VisualPropertyValueType) => void
      closePopover: () => void
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
    pickerRender: ColorPickerDiverging,
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
        closePopover: () => void
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
  const [activeTab, setActiveTab] = React.useState(0)
  const isColor = props.visualProperty.displayName.includes("Color");
  const vpName = props.visualProperty.name;
  const isEdgeLineColor = vpName === EdgeVisualPropertyName.EdgeLineColor || vpName === EdgeVisualPropertyName.EdgeTargetArrowColor || vpName === EdgeVisualPropertyName.EdgeSourceArrowColor;
  const showValuePicker = (value: Element | null): void => {
    setValuePicker(value)
  }

  const closePopover = (): void => {
    setValuePicker(null);
  };

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
          {
            isColor ? (
              <>
                <Tabs
                  value={activeTab}
                  onChange={(event, newValue) => setActiveTab(newValue)}
                  aria-label="Tab panel"
                >
                  <Tab label="ColorBrewer Sequential" />
                  <Tab label="ColorBrewer Diverging" />
                  <Tab label="Viridis Sequential" />
                  <Tab label="Swatches" />
                  <Tab label="Color Picker" />
                </Tabs>
              </>
            ) : null
          }
          {activeTab === 0 && (
            <Box
              sx={{
                margin: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {(
                vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
                vpType2RenderMapSequential[props.visualProperty.type]
                  .pickerRender ??
                (() => { })
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
          )}
          {activeTab === 1 && (
            <Box
              sx={{
                margin: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {(
                vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
                vpType2RenderMapDiverging[props.visualProperty.type]
                  .pickerRender ??
                (() => { })
              )({
                onValueChange: (value: VisualPropertyValueType) =>
                  props.onValueChange(value),
                currentValue: props.currentValue,
                closePopover: closePopover,
              })}
            </Box>
          )}

          {activeTab === 2 && (
            <Box
              sx={{
                margin: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {' '}
              {(
                vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
                vpType2RenderMapViridis[props.visualProperty.type]
                  .pickerRender ??
                (() => { })
              )({
                onValueChange: (value: VisualPropertyValueType) =>
                  props.onValueChange(value),
                currentValue: props.currentValue,
                closePopover: closePopover,
              })}
            </Box>
          )}

          {activeTab === 3 && (
            <Box
              sx={{
                margin: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {' '}
              {(
                vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
                vpType2RenderMap2[props.visualProperty.type].pickerRender ??
                (() => { })
              )({
                onValueChange: (value: VisualPropertyValueType) =>
                  props.onValueChange(value),
                currentValue: props.currentValue,
                closePopover: closePopover,
              })}
            </Box>
          )}

          {activeTab === 4 && (
            <Box
              sx={{
                margin: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {' '}
              {(
                vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
                vpType2RenderMap[props.visualProperty.type].pickerRender ??
                (() => { })
              )({
                onValueChange: (value: VisualPropertyValueType) =>
                  props.onValueChange(value),
                currentValue: props.currentValue,
                closePopover: closePopover
              })}
            </Box>
          )}
          {props.showCheckbox && isEdgeLineColor &&
            (
              <>
                <Divider />
                <LockColorCheckbox
                  currentNetworkId={props.currentNetworkId}
                />
              </>
            )
          }
        </Box>
      </Popover>
    </Box>
  )
}
