export const CyjsEdgeVisualPropertyName = {
  Width: 'width',
  CurveStyle: 'curve-style',
  LineStyle: 'line-style',
  LineColor: 'line-color',
  LineFill: 'line-fill',
  LineCap: 'line-cap',
  LineDashPattern: 'line-dash-pattern',
  LineDashOffset: 'line-dash-offset',
  TargetArrowShape: 'target-arrow-shape',
  TargetArrowColor: 'target-arrow-color',
  TargetArrowFill: 'target-arrow-fill',
  TargetArrowOpacity: 'target-arrow-opacity',
  SourceArrowShape: 'source-arrow-shape',
  SourceArrowColor: 'source-arrow-color',
  SourceArroewFill: 'source-arrow-fill',
  SourceArrowOpacity: 'source-arrow-opacity',
} as const

export type CyjsEdgeVisualPropertyType =
  typeof CyjsEdgeVisualPropertyName[keyof typeof CyjsEdgeVisualPropertyName]

export const CyjsNodeVisualPropertyName = {
  Width: 'width',
  Height: 'height',
  Shape: 'shape',
  Label: 'label',
  BackgroundColor: 'background-color',
  BackgroundOpacity: 'background-opacity',
  BackgroundFill: 'background-fill',
} as const

export type CyjsNodeVisualPropertyType =
  typeof CyjsNodeVisualPropertyName[keyof typeof CyjsNodeVisualPropertyName]

// export type CyjsNodeVisualPropertyName =
//   | 'width'
//   | 'height'
//   | 'shape'
//   | 'shape-polygon-points'
//   | 'background-color'
//   | 'background-blacken'
//   | 'background-opacity'
//   | 'background-fill'
//   | 'background-image'
//   | 'background-image-opacity'
//   | 'background-image-crossorigin'
//   | 'background-image-containment'
//   | 'background-position-x'
//   | 'background-position-y'
//   | 'background-width-relative-to'
//   | 'background-height-relative-to'
//   | 'background-width'
//   | 'background-height'
//   | 'background-offset-x'
//   | 'background-offset-y'
//   | 'background-repeat'
//   | 'background-fit'

export const CyjsVisualPropertyName = {
  ...CyjsNodeVisualPropertyName,
  ...CyjsEdgeVisualPropertyName,
} as const

export type CyjsVisualPropertyType =
  | CyjsNodeVisualPropertyType
  | CyjsEdgeVisualPropertyType
