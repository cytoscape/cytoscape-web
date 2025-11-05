import { IdType } from '../IdType'
import { ValueType,ValueTypeName } from '../TableModel'

export interface NetworkProperty {
  subNetworkId: IdType | null
  value: ValueType
  predicateString: string
  dataType: ValueTypeName
}
