import { IdType } from '../IdType'
import { ValueTypeName, ValueType } from '../TableModel'

export interface NetworkProperty {
  subNetworkId: IdType | null
  value: ValueType
  predicateString: string
  dataType: ValueTypeName
}

