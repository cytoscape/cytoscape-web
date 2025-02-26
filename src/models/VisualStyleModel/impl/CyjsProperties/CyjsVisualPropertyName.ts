export const CyjsEdgeVisualPropertyName = {
  Width: 'width',
  CurveStyle: 'curve-style',
  LineStyle: 'line-style',
  LineColor: 'line-color',
  LineFill: 'line-fill',
  LineCap: 'line-cap',
  LineOpacity: 'line-opacity',
  LineDashPattern: 'line-dash-pattern',
  LineDashOffset: 'line-dash-offset',
  TargetArrowShape: 'target-arrow-shape',
  TargetArrowColor: 'target-arrow-color',
  TargetArrowFill: 'target-arrow-fill',
  TargetArrowOpacity: 'target-arrow-opacity',
  SourceArrowShape: 'source-arrow-shape',
  SourceArrowColor: 'source-arrow-color',
  SourceArrowFill: 'source-arrow-fill',
  SourceArrowOpacity: 'source-arrow-opacity',
  TextMaxWidth: 'text-max-width',
  EdgeZOrder: 'z-index',
} as const

export type CyjsEdgeVisualPropertyType =
  (typeof CyjsEdgeVisualPropertyName)[keyof typeof CyjsEdgeVisualPropertyName]

export const CyjsNodeVisualPropertyName = {
  Width: 'width',
  Height: 'height',
  Shape: 'shape',
  BackgroundColor: 'background-color',
  Opacity: 'background-opacity',

  BorderColor: 'border-color',
  BorderLineType: 'border-style',
  BorderWidth: 'border-width',
  BorderOpacity: 'border-opacity',

  Label: 'label',
  LabelColor: 'color',
  LabelFontSize: 'font-size',
  LabelFont: 'font-family',
  LabelHorizontalAlign: 'text-halign',
  LabelVerticalAlign: 'text-valign',
  LabelRotation: 'text-rotation',
  LabelOpacity: 'text-opacity',
  TextMaxWidth: 'text-max-width',

  NodeZOrder: 'z-index',
  Visibility: 'display',

  PieSize: 'pie-size',
  Pie1BackgroundColor: 'pie-1-background-color',
  Pie1BackgroundSize: 'pie-1-background-size',
  Pie1BackgroundOpacity: 'pie-1-background-opacity',
  Pie2BackgroundColor: 'pie-2-background-color',
  Pie2BackgroundSize: 'pie-2-background-size',
  Pie2BackgroundOpacity: 'pie-2-background-opacity',
  Pie3BackgroundColor: 'pie-3-background-color',
  Pie3BackgroundSize: 'pie-3-background-size',
  Pie3BackgroundOpacity: 'pie-3-background-opacity'
} as const

export type CyjsNodeVisualPropertyType =
  (typeof CyjsNodeVisualPropertyName)[keyof typeof CyjsNodeVisualPropertyName]

export type CyjsNodeVisualPropertyTypes =
  | 'width'
  | 'height'
  | 'shape'
  | 'shape-polygon-points'
  | 'background-color'
  | 'background-blacken'
  | 'background-opacity'
  | 'background-fill'
  | 'background-image'
  | 'background-image-opacity'
  | 'background-image-crossorigin'
  | 'background-image-containment'
  | 'background-position-x'
  | 'background-position-y'
  | 'background-width-relative-to'
  | 'background-height-relative-to'
  | 'background-width'
  | 'background-height'
  | 'background-offset-x'
  | 'background-offset-y'
  | 'background-repeat'
  | 'background-fit'
  | 'background-clip'
  | 'background-clip-padding'
  | 'border-color'
  | 'border-opacity'
  | 'border-width'
  | 'border-style'
  | 'border-fill'
  | 'border-blacken'
  | 'border-image'
  | 'border-image-opacity'
  | 'border-image-crossorigin'
  | 'border-image-containment'
  | 'border-position-x'
  | 'border-position-y'
  | 'border-width-relative-to'
  | 'border-height-relative-to'
  | 'z-index'
  | 'pie-size'
  | 'pie-1-background-color'
  | 'pie-1-background-size'
  | 'pie-1-background-opacity'
  | 'pie-2-background-color'
  | 'pie-2-background-size'
  | 'pie-2-background-opacity'
  | 'pie-3-background-color'
  | 'pie-3-background-size'
  | 'pie-3-background-opacity'

export const CyjsVisualPropertyName = {
  ...CyjsNodeVisualPropertyName,
  ...CyjsEdgeVisualPropertyName,
} as const

export type CyjsVisualPropertyType =
  | CyjsNodeVisualPropertyType
  | CyjsEdgeVisualPropertyType
