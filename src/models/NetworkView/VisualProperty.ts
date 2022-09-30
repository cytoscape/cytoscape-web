import {
  NodeVisualPropertyName,
  EdgeVisualPropertyName,
} from './VisualPropertyName'

export interface VisualProperty<T> {
  name: NodeVisualPropertyName | EdgeVisualPropertyName
  value: T
}
