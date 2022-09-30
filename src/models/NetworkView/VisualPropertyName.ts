export type VisualPropertyName =
  | 'color'
  | 'width'
  | 'opacity'
  | 'label'
  | 'labelColor'
  | 'labelSize'
  | 'labelOpacity'

export type NodeVisualPropertyName = VisualPropertyName | 'shape' | 'height' | 'position'
export type EdgeVisualPropertyName = VisualPropertyName | 'lineType'