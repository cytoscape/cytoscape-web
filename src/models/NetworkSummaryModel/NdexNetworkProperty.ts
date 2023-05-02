import { IdType } from '../IdType'
import { ValueTypeName, ValueType } from '../TableModel'

export interface NdexNetworkProperty {
  subNetworkId: IdType | null
  value: ValueType
  predicateString: string
  dataType: ValueTypeName
}
