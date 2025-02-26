import { CxValue } from '../../CxModel/Cx2/CxValue'
import { VisualPropertyName } from '../VisualPropertyName'
import {
  ColorType,
  FontType,
  NodeBorderLineType,
  NodeShapeType,
  VisualPropertyValueType,
  VisibilityType,
  EdgeLineType,
  NodeLabelPositionType,
  EdgeArrowShapeType,
} from '../VisualPropertyValue'
import {
  DiscreteMappingFunction,
  ContinuousMappingFunction,
  PassthroughMappingFunction,
  VisualProperty,
  VisualStyle,
} from '..'
import { ValueTypeName } from '../../TableModel'

type CXLabelPositionValueType = 'center' | 'top' | 'bottom' | 'left' | 'right'
export interface CXLabelPositionType {
  HORIZONTAL_ALIGN: CXLabelPositionValueType
  VERTICAL_ALIGN: CXLabelPositionValueType
  HORIZONTAL_ANCHOR: CXLabelPositionValueType
  VERTICAL_ANCHOR: CXLabelPositionValueType
  MARGIN_X: number
  MARGIN_Y: number
  JUSTIFICATION: CXLabelPositionValueType
}

interface CXFontFaceType {
  FONT_FAMILY: 'serif' | 'sans-serif' | 'monospace'
  FONT_STYLE: 'normal' | 'bold'
  FONT_WEIGHT: string
}

export type CXVisualPropertyValue =
  | VisualPropertyValueType
  | CXLabelPositionType
  | CXFontFaceType
  | CXLabelPositionType

export interface CXDiscreteMappingFunction<T> {
  type: 'DISCRETE'
  definition: {
    attribute: string
    map: Array<{
      v: CxValue
      vp: T
    }>
    type?: ValueTypeName
  }
}

export interface CXPassthroughMappingFunction {
  type: 'PASSTHROUGH'
  definition: {
    attribute: string
    type?: ValueTypeName
  }
}

export interface CXContinuousMappingFunction<T> {
  type: 'CONTINUOUS'
  definition: {
    attribute: string
    map: Array<{
      max?: number
      min?: number
      maxVPValue?: T
      minVPValue?: T
      includeMax: boolean
      includeMin: boolean
    }>
    type?: ValueTypeName
  }
}

export type CXVisualMappingFunction<T> =
  | CXDiscreteMappingFunction<T>
  | CXContinuousMappingFunction<T>
  | CXPassthroughMappingFunction

export type CXId = number

export const vpToCX = (
  vpName: VisualPropertyName,
  vpValue: VisualPropertyValueType,
): CXVisualPropertyValue => {
  const defaultFontValue: CXVisualPropertyValue = {
    FONT_FAMILY: 'sans-serif',
    FONT_STYLE: 'normal',
    FONT_WEIGHT: 'normal',
  }

  if (vpName === 'nodeLabelFont' || vpName === 'edgeLabelFont') {
    return Object.assign({}, defaultFontValue, { FONT_FAMILY: vpValue })
  }

  return vpValue as CXVisualPropertyValue
}

export const convertPassthroughMappingToCX = (
  vs: VisualStyle,
  vp: VisualProperty<VisualPropertyValueType>,
  mapping: PassthroughMappingFunction,
  isNameInTable: boolean,
): CXPassthroughMappingFunction => {
  const { attribute } = mapping

  return {
    type: 'PASSTHROUGH',
    definition: {
      attribute,
      ...(isNameInTable ? {} : { type: mapping.attributeType }),
    },
  }
}

export const convertDiscreteMappingToCX = (
  vs: VisualStyle,
  vp: VisualProperty<VisualPropertyValueType>,
  mapping: DiscreteMappingFunction,
  isNameInTable: boolean,
): CXDiscreteMappingFunction<CXVisualPropertyValue> => {
  const { vpValueMap, attribute } = mapping

  return {
    type: 'DISCRETE',
    definition: {
      attribute,
      map: Array.from(vpValueMap.entries()).map(([value, vpValue]) => ({
        v: value,
        vp: vpToCX(vp.name, vpValue),
      })),
      ...(isNameInTable ? {} : { type: mapping.attributeType }),
    },
  }
}
export const convertContinuousMappingToCX = (
  vs: VisualStyle,
  vp: VisualProperty<VisualPropertyValueType>,
  mapping: ContinuousMappingFunction,
  isNameInTable: boolean,
): CXContinuousMappingFunction<CXVisualPropertyValue> => {
  const { min, max, controlPoints, attribute, ltMinVpValue, gtMaxVpValue } =
    mapping

  const intervals = []

  for (let i = 0; i < controlPoints.length - 1; i++) {
    const curr = controlPoints[i]
    const next = controlPoints[i + 1]

    if (curr != null && next != null) {
      intervals.push({
        min: curr.value as number,
        max: next.value as number,
        minVPValue: vpToCX(vp.name, curr.vpValue),
        maxVPValue: vpToCX(vp.name, next.vpValue),
        includeMin: curr.inclusive ?? true,
        includeMax: next.inclusive ?? true,
      })
    }
  }

  return {
    type: 'CONTINUOUS',
    definition: {
      map: [
        {
          max: min.value as number,
          maxVPValue: vpToCX(vp.name, ltMinVpValue),
          includeMax: min.inclusive ?? false,
          includeMin: false, // dummy value, not actually used here
        },
        ...intervals,
        {
          min: max.value as number,
          minVPValue: vpToCX(vp.name, gtMaxVpValue),
          includeMin: max.inclusive ?? false,
          includeMax: false, // dummy value, not actually used here
        },
      ],
      attribute,
      ...(isNameInTable ? {} : { type: mapping.attributeType }),
    },
  }
}

export interface CXVisualPropertyConverter<T> {
  cxVPName: string
  valueConverter: (cxVPValue: CXVisualPropertyValue) => T
}

export const VPColorConverter = (
  cxVPName: string,
): CXVisualPropertyConverter<ColorType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): ColorType =>
      cxVPValue as ColorType,
  }
}
export const VPStringConverter = (
  cxVPName: string,
): CXVisualPropertyConverter<string> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): string =>
      cxVPValue as string,
  }
}

export const VPNumberConverter = (
  cxVPName: string,
): CXVisualPropertyConverter<number> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): number =>
      cxVPValue as number,
  }
}
export const VPFontTypeConverter = (
  cxVPName: string,
): CXVisualPropertyConverter<FontType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): FontType =>
      (cxVPValue as CXFontFaceType).FONT_FAMILY as FontType,
  }
}

export const VPNodeBorderLineTypeConverter = (
  cxVPName: string,
): CXVisualPropertyConverter<NodeBorderLineType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): NodeBorderLineType =>
      cxVPValue as NodeBorderLineType,
  }
}

export const VPNodeShapeTypeConverter = (
  cxVPName: string,
): CXVisualPropertyConverter<NodeShapeType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): NodeShapeType =>
      cxVPValue as NodeShapeType,
  }
}

export const VPVisibilityTypeConverter = (
  cxVPName: string,
): CXVisualPropertyConverter<VisibilityType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): VisibilityType =>
      cxVPValue as VisibilityType,
  }
}

export const VPEdgeLineTypeConverter = (
  cxVPName: string,
): CXVisualPropertyConverter<EdgeLineType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): EdgeLineType =>
      cxVPValue as EdgeLineType,
  }
}

export const VPEdgeArrowShapeTypeConverter = (
  cxVPName: string,
): CXVisualPropertyConverter<EdgeArrowShapeType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): EdgeArrowShapeType =>
      cxVPValue === EdgeArrowShapeType.Arrow
        ? EdgeArrowShapeType.Triangle
        : (cxVPValue as EdgeArrowShapeType),
  }
}
export const VPBooleanConverter = (
  cxVPName: string,
): CXVisualPropertyConverter<boolean> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): boolean =>
      cxVPValue as boolean,
  }
}

export const VPNodeLabelPositionConverter = (
  cxVPName: string,
): CXVisualPropertyConverter<NodeLabelPositionType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): NodeLabelPositionType =>
      cxVPValue as NodeLabelPositionType,
  }
}

// lookup table of visual style property names to cx property names
export const cxVisualPropertyConverter: Record<
  VisualPropertyName,
  CXVisualPropertyConverter<VisualPropertyValueType>
> = {
  nodeShape: VPNodeShapeTypeConverter('NODE_SHAPE'),
  nodeBorderColor: VPColorConverter('NODE_BORDER_COLOR'),
  nodeBorderLineType: VPColorConverter('NODE_BORDER_STYLE'),
  nodeBorderWidth: VPNumberConverter('NODE_BORDER_WIDTH'),
  nodeBorderOpacity: VPNumberConverter('NODE_BORDER_OPACITY'),
  nodeHeight: VPNumberConverter('NODE_HEIGHT'),
  nodeWidth: VPNumberConverter('NODE_WIDTH'),
  nodeBackgroundColor: VPColorConverter('NODE_BACKGROUND_COLOR'),
  nodeLabel: VPStringConverter('NODE_LABEL'),
  nodeLabelColor: VPColorConverter('NODE_LABEL_COLOR'),
  nodeLabelFontSize: VPNumberConverter('NODE_LABEL_FONT_SIZE'),
  nodeLabelFont: VPFontTypeConverter('NODE_LABEL_FONT_FACE'),
  nodeLabelPosition: VPNodeLabelPositionConverter('NODE_LABEL_POSITION'),
  nodeLabelRotation: VPNumberConverter('NODE_LABEL_ROTATION'),
  nodeLabelOpacity: VPNumberConverter('NODE_LABEL_OPACITY'),
  // nodePositionX: VPNumberConverter('NODE_X_LOCATION'),
  // nodePositionY: VPNumberConverter('NODE_Y_LOCATION'),
  // nodePositionZ: VPNumberConverter('NODE_Z_LOCATION'),
  nodeOpacity: VPNumberConverter('NODE_BACKGROUND_OPACITY'),
  nodeVisibility: VPVisibilityTypeConverter('NODE_VISIBILITY'),
  nodeSelectedPaint: VPColorConverter('NODE_SELECTED_PAINT'),
  nodeMaxLabelWidth: VPNumberConverter('NODE_LABEL_MAX_WIDTH'),
  nodeZOrder: VPNumberConverter('NODE_Z_LOCATION'), 

  pieSize: VPNumberConverter('NODE_CUSTOMGRAPHICS_SIZE_6'),
  pieBackgroundColor: VPColorConverter('NODE_BORDER_COLOR'),
  pieBackgroundSize: VPNumberConverter('NODE_CUSTOMGRAPHICS_SIZE_6'),
  pieBackgroundOpacity: VPNumberConverter('EDGE_LABEL_ROTATION'),

  edgeLineType: VPEdgeLineTypeConverter('EDGE_LINE_STYLE'),
  edgeLineColor: VPColorConverter('EDGE_LINE_COLOR'),
  edgeWidth: VPNumberConverter('EDGE_WIDTH'),
  edgeTargetArrowShape: VPEdgeArrowShapeTypeConverter(
    'EDGE_TARGET_ARROW_SHAPE',
  ),
  edgeSourceArrowShape: VPEdgeArrowShapeTypeConverter(
    'EDGE_SOURCE_ARROW_SHAPE',
  ),
  edgeTargetArrowColor: VPColorConverter('EDGE_TARGET_ARROW_COLOR'),
  edgeSourceArrowColor: VPColorConverter('EDGE_SOURCE_ARROW_COLOR'),
  edgeLabel: VPStringConverter('EDGE_LABEL'),
  edgeLabelColor: VPColorConverter('EDGE_LABEL_COLOR'),
  edgeLabelFontSize: VPNumberConverter('EDGE_LABEL_FONT_SIZE'),
  edgeLabelFont: VPFontTypeConverter('EDGE_LABEL_FONT_FACE'),
  edgeLabelRotation: VPNumberConverter('EDGE_LABEL_ROTATION'),
  // edgeLabelAutoRotation: VPBooleanConverter('EDGE_LABEL_AUTO_ROTATION'),
  edgeLabelOpacity: VPNumberConverter('EDGE_LABEL_OPACITY'),
  edgeOpacity: VPNumberConverter('EDGE_OPACITY'),
  edgeVisibility: VPVisibilityTypeConverter('EDGE_VISIBILITY'),
  edgeSelectedPaint: VPColorConverter('EDGE_SELECTED_PAINT'),
  edgeMaxLabelWidth: VPNumberConverter('EDGE_LABEL_MAX_WIDTH'),
  edgeZOrder: VPNumberConverter('EDGE_Z_LOCATION'),

  networkBackgroundColor: VPColorConverter('NETWORK_BACKGROUND_COLOR'),
}
