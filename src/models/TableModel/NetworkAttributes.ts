import { IdType } from '../IdType'
import { AttributeName, ValueType } from '.'

/**
 * Network attributes stored as a Record
 */
export interface NetworkAttributes {
  readonly id: IdType
  attributes: Record<AttributeName, ValueType>
}
