import { Bypass } from '../Bypass'
import { VisualMappingFunction } from '../VisualMappingFunction'
import { VisualPropertyName } from '../VisualPropertyName'
import {
  Color,
  FontType,
  NodeBorderLineType,
  NodeShapeType,
  VisualPropertyValueType,
  NodeLabelPositionType,
  VisibilityType,
  EdgeLineType,
  EdgeArrowShapeType,
} from '../VisualPropertyValue'

type CXLabelPositionValueType = 'center' | 'top' | 'bottom' | 'left' | 'right'
interface CXLabelPositionType {
  HORIZONTAL_ALIGN: CXLabelPositionValueType
  VERTICAL_ALIGN: CXLabelPositionValueType
  HORIZONTAL_ANCHOR: CXLabelPositionValueType
  VERTICAL_ANCHOR: CXLabelPositionValueType
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

// TODO
export type CXVisualMappingFunction = any
// TODO
export type CXBypass = any

export interface CxVisualPropertyConverter<T> {
  cxVPName: string
  valueConverter: (cxVPValue: CXVisualPropertyValue) => T
  // mappingConverter: () => VisualMappingFunction<T>
  mappingConverter: () => null
  bypassConverter: () => Bypass<T>
}

export const VPColorConverter = (
  cxVPName: string,
): CxVisualPropertyConverter<Color> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): Color =>
      cxVPValue as Color,
    mappingConverter: () => null,
    bypassConverter: () => ({} as Bypass<Color>),
  }
}
export const VPStringConverter = (
  cxVPName: string,
): CxVisualPropertyConverter<string> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): string =>
      cxVPValue as string,
    mappingConverter: () => null,
    bypassConverter: () => ({} as Bypass<string>),
  }
}

export const VPNumberConverter = (
  cxVPName: string,
): CxVisualPropertyConverter<number> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): number =>
      cxVPValue as number,
    mappingConverter: () => null,
    bypassConverter: () => ({} as Bypass<number>),
  }
}
export const VPFontTypeConverter = (
  cxVPName: string,
): CxVisualPropertyConverter<FontType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXFontFaceType): FontType =>
      cxVPValue.FONT_FAMILY as FontType,
    mappingConverter: () => null,
    bypassConverter: () => ({} as Bypass<FontType>),
  }
}

export const VPNodeBorderLineTypeConverter = (
  cxVPName: string,
): CxVisualPropertyConverter<NodeBorderLineType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): NodeBorderLineType =>
      cxVPValue as NodeBorderLineType,
    mappingConverter: () => null,
    bypassConverter: () => ({} as Bypass<NodeBorderLineType>),
  }
}

export const VPNodeShapeTypeConverter = (
  cxVPName: string,
): CxVisualPropertyConverter<NodeShapeType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: CXVisualPropertyValue): NodeShapeType =>
      cxVPValue as NodeShapeType,
    mappingConverter: () => null,
    bypassConverter: () => ({} as Bypass<NodeShapeType>),
  }
}

export const VPNodeLabelPositionTypeConverter = (
  cxVPName: string,
): CxVisualPropertyConverter<NodeLabelPositionType> => {
  return {
    cxVPName,
    // TODO
    valueConverter: (cxVPValue: CXLabelPositionType): NodeLabelPositionType => {
      return {
        horizontalAlign: 'center',
        verticalAlign: 'center',
      }
    },
    mappingConverter: () => null,
    bypassConverter: () => ({} as Bypass<NodeLabelPositionType>),
  }
}

export const VPVisibilityTypeConverter = (
  cxVPName: string,
): CxVisualPropertyConverter<VisibilityType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: VisibilityType): VisibilityType =>
      cxVPValue as VisibilityType,
    mappingConverter: () => null,
    bypassConverter: () => ({} as Bypass<VisibilityType>),
  }
}

export const VPEdgeLineTypeConverter = (
  cxVPName: string,
): CxVisualPropertyConverter<EdgeLineType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: EdgeLineType): EdgeLineType =>
      cxVPValue as EdgeLineType,
    mappingConverter: () => null,
    bypassConverter: () => ({} as Bypass<EdgeLineType>),
  }
}

export const VPEdgeArrowShapeTypeConverter = (
  cxVPName: string,
): CxVisualPropertyConverter<EdgeArrowShapeType> => {
  return {
    cxVPName,
    valueConverter: (cxVPValue: EdgeArrowShapeType): EdgeArrowShapeType =>
      cxVPValue as EdgeArrowShapeType,
    mappingConverter: () => null,
    bypassConverter: () => ({} as Bypass<EdgeArrowShapeType>),
  }
}
export const VPBooleanConverter = (
  cxVPName: string,
): CxVisualPropertyConverter<boolean> => {
  return {
    cxVPName,
    // TODO
    valueConverter: (cxVPValue: boolean): boolean => cxVPValue as boolean,
    mappingConverter: () => null,
    bypassConverter: () => ({} as Bypass<boolean>),
  }
}

// lookup table of visual style property names to cx property names
export const cxVisualPropertyConverter: Record<
  VisualPropertyName,
  CxVisualPropertyConverter<VisualPropertyValueType>
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
  nodeLabelPosition: VPNodeLabelPositionTypeConverter('NODE_LABEL_POSITION'),
  nodeLabelRotation: VPNumberConverter('NODE_LABEL_ROTATION'),
  nodeLabelOpacity: VPNumberConverter('NODE_LABEL_OPACITY'),
  nodePositionX: VPNumberConverter('NODE_X_LOCATION'),
  nodePositionY: VPNumberConverter('NODE_Y_LOCATION'),
  nodePositionZ: VPNumberConverter('NODE_Z_LOCATION'),
  nodeOpacity: VPNumberConverter('NODE_BACKGROUND_OPACITY'),
  nodeVisibility: VPVisibilityTypeConverter('NODE_VISIBLITY'),

  edgeLineType: VPEdgeLineTypeConverter('EDGE_LINE_TYPE'),
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
  edgeLabelAutoRotation: VPBooleanConverter('EDGE_LABEL_AUTO_ROTATION'),
  edgeLabelOpacity: VPNumberConverter('EDGE_LABEL_OPACITY'),
  edgeOpacity: VPNumberConverter('EDGE_OPACITY'),
  edgeVisibility: VPVisibilityTypeConverter('EDGE_VISIBILITY'),
  networkBackgroundColor: VPColorConverter('NETWORK_BACKGROUND_COLOR'),
}
