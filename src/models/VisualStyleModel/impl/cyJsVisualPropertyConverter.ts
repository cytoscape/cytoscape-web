import { VisualPropertyValueType, VisualPropertyName } from '..'
import {
  Color,
  FontType,
  NodeBorderLineType,
  NodeShapeType,
  HoritzontalAlignType,
  VerticalAlignType,
  VisibilityType,
  EdgeLineType,
  EdgeArrowShapeType,
} from '../VisualPropertyValue'

export type CyJsPropertyName = string
interface CyJsVisualPropertyConverter<T> {
  cyJsVPName: CyJsPropertyName
  valueConverter: (vpValue: VisualPropertyValueType) => T
}

export const nodeShapeConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<NodeShapeType> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: NodeShapeType): NodeShapeType => vpValue,
  }
}

export const colorConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<Color> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: Color): Color => vpValue,
  }
}

export const borderLineTypeConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<NodeBorderLineType> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: NodeBorderLineType): NodeBorderLineType =>
      vpValue,
  }
}

export const numberConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<number> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: number): number => vpValue,
  }
}

export const stringConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<string> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: string): string => vpValue,
  }
}

export const fontTypeConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<string> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: FontType): FontType => vpValue,
  }
}

export const horitzontalAlignTypeConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<HoritzontalAlignType> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: HoritzontalAlignType): HoritzontalAlignType =>
      vpValue,
  }
}

export const verticalAlignTypeConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<VerticalAlignType> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: VerticalAlignType): VerticalAlignType => vpValue,
  }
}

export const visibilityTypeConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<VisibilityType> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: VisibilityType): VisibilityType => vpValue,
  }
}

export const edgeLineTypeConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<EdgeLineType> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: EdgeLineType): EdgeLineType => vpValue,
  }
}

export const edgeArrowShapeTypeConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<EdgeArrowShapeType> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: EdgeArrowShapeType): EdgeArrowShapeType =>
      vpValue,
  }
}

export const booleanConverter = (
  cyJsVPName: string,
): CyJsVisualPropertyConverter<boolean> => {
  return {
    cyJsVPName,
    valueConverter: (vpValue: boolean): boolean => vpValue,
  }
}

export const cyJsVisualPropertyConverter: Record<
  VisualPropertyName,
  CyJsVisualPropertyConverter<VisualPropertyValueType> | null
> = {
  nodeShape: nodeShapeConverter('shape'),
  nodeBorderColor: colorConverter('border-color'),
  nodeBorderLineType: borderLineTypeConverter('border-style'),
  nodeBorderWidth: numberConverter('border-width'),
  nodeBorderOpacity: numberConverter('border-opacity'),
  nodeHeight: numberConverter('height'),
  nodeWidth: numberConverter('width'),
  nodeBackgroundColor: colorConverter('background-color'),
  nodeLabel: stringConverter('label'),
  nodeLabelColor: colorConverter('color'),
  nodeLabelFontSize: numberConverter('font-size'),
  nodeLabelFont: fontTypeConverter('font-family'),
  nodeLabelHorizontalAlign: horitzontalAlignTypeConverter('text-halign'),
  nodeLabelVerticalAlign: verticalAlignTypeConverter('text-valign'),
  nodeLabelRotation: numberConverter('text-rotation'),
  nodeLabelOpacity: numberConverter('text-opacity'),
  nodePositionX: null,
  nodePositionY: null,
  nodePositionZ: null,
  nodeOpacity: numberConverter('background-opacity'),
  nodeVisibility: visibilityTypeConverter('display'),

  edgeLineType: edgeLineTypeConverter('line-style'),
  edgeLineColor: colorConverter('line-color'),
  edgeWidth: numberConverter('width'),
  edgeTargetArrowShape: edgeArrowShapeTypeConverter('target-arrow-shape'),
  edgeSourceArrowShape: edgeArrowShapeTypeConverter('source-arrow-shape'),
  edgeTargetArrowColor: colorConverter('target-arrow-color'),
  edgeSourceArrowColor: colorConverter('source-arrow-color'),
  edgeLabel: stringConverter('label'),
  edgeLabelColor: colorConverter('color'),
  edgeLabelFontSize: numberConverter('font-size'),
  edgeLabelFont: fontTypeConverter('font-family'),
  edgeLabelRotation: numberConverter('text-rotation'),
  edgeLabelAutoRotation: booleanConverter('autorotate'),
  edgeLabelOpacity: numberConverter('text-opacity'),
  edgeOpacity: numberConverter('line-opacity'),
  edgeVisibility: visibilityTypeConverter('display'),

  networkBackgroundColor: null,
}
