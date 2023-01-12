import { IdType } from '../IdType'
import { ValueTypeName } from '../TableModel'

export interface NdexNetworkProperty {
  subNetworkId: IdType | null
  value: string
  predicateString: string
  dataType: ValueTypeName
}
