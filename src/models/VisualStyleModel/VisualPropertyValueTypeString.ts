//  this is an actual string representation of the visual property value typ
// needed by ui code to make it easier to determine what to render
export const VisualPropertyValueTypeString = {
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

export type VisualPropertyValueTypeString =
  typeof VisualPropertyValueTypeString[keyof typeof VisualPropertyValueTypeString]
