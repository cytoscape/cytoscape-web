//  this is an actual string representation of the visual property value typ
// needed by ui code to make it easier to determine what to render
export const VisualPropertyValueTypeName = {
  Color: 'color',
  NodeShape: 'nodeShape',
  EdgeLine: 'edgeLine',
  EdgeArrowShape: 'edgeArrowShape',
  Font: 'font',
  HoritzontalAlign: 'horitzontalAlign',
  VerticalAlign: 'verticalAlign',
  NodeBorderLine: 'nodeBorderLine',
  Visibility: 'visibility',
  Number: 'number',
  String: 'string',
  Boolean: 'boolean',
}

export type VisualPropertyValueTypeName =
  typeof VisualPropertyValueTypeName[keyof typeof VisualPropertyValueTypeName]
