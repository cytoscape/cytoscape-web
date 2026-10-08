import type { IdType } from '../IdType'
import type { AttributeName } from './AttributeName'
import type { ValueType } from './ValueType'

/**
 * Network attributes stored as a Record
 */
export interface NetworkAttributes {
  readonly id: IdType
  attributes: Record<AttributeName, ValueType>
}
