import { SelectedDataType } from './SelectedDataType'
import { SelectedDataScope } from '../AppModel/SelectedDataScope'
import { ValueTypeName } from '../TableModel'

export interface ServiceInputDefinition {
  type: SelectedDataType
  scope: SelectedDataScope
  inputColumns: InputColumn[]
  inputNetwork: InputNetwork
}

export interface InputColumn {
  name: string
  description?: string
  dataType:
    | ValueTypeName
    | 'list'
    | 'number'
    | 'wholenumber'
    | 'list_of_number'
    | 'list_of_wholenumber'
  allowMultipleSelection: boolean
  defaultColumnName: string
  columnName: string
}

export const Model = {
  // Full CX2 network.
  network: 'network',

  //Graph in CX2 format (IDs only)
  graph: 'graph',
} as const

export type ModelType = (typeof Model)[keyof typeof Model]

export const Format = {
  cx2: 'cx2',

  // The format of the edge list.
  // Each element is a tab-delimited string in the format:
  //
  // source_id    target_id    edge_id    interaction
  //
  edgeList: 'edgeList',
} as const

export type FormatType = (typeof Format)[keyof typeof Format]

export interface InputNetwork {
  model: ModelType
  format: FormatType
}
