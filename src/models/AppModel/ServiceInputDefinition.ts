import { SelectedDataType } from './SelectedDataType'

export interface ServiceInputDefinition {
  type: SelectedDataType
  scope: string
  inputColumns: InputColumn[]
  inputNetwork: InputNetwork
}

export interface InputColumn {
  name: string
  description?: string
  dataType: string
  allowMultipleSelection: boolean
  defaultColumnName: string
  columnName: string
}

const Model = {
  // Full CX2 network.
  network: 'network',

  //Graph in CX2 format (IDs only)
  graph: 'graph',
} as const

export type Model = (typeof Model)[keyof typeof Model]

const Format = {
  cx2: 'cx2',

  // The format of the edge list.
  // Each element is a tab-delimited string in the format:
  //
  // source_id    target_id    edge_id    interaction
  //
  edgeList: 'edgeList',
} as const

export type Format = (typeof Format)[keyof typeof Format]

export interface InputNetwork {
  model: Model
  format: Format
}
