import { IdType } from '../IdType'
import { VisualPropertyValueType } from './VisualPropertyValue'

export type Bypass<T extends VisualPropertyValueType> = Map<IdType, T>
