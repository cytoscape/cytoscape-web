import { DataTableValue } from 'primereact/datatable'
import { v4 as uuidv4 } from 'uuid'

import { Table, ValueType, ValueTypeName } from '../../../../models/TableModel'
import { ColumnAssignmentState } from '../ColumnAssignmentState'
import { ColumnAssignmentType } from '../ColumnAssignmentType'
import { DelimiterType } from '../DelimiterType'
import { parseValue } from './ParseValues'
import { Network } from '../../../../models/NetworkModel'
import {
  MappingFunctionType,
  VisualPropertyValueTypeName,
  VisualStyle,
} from '../../../../models/VisualStyleModel'
import { createVisualStyle } from '../../../../models/VisualStyleModel/impl/VisualStyleFnImpl'
import { createViewModelFromNetwork } from '../../../../models/ViewModel/impl/ViewModelImpl'
import { NdexNetworkSummary } from '../../../../models/NetworkSummaryModel'
import { Visibility } from '../../../../models/NetworkSummaryModel/Visibility'
import { NetworkView } from '../../../../models/ViewModel'

export const DEFAULT_COLUMN_MEANING = ColumnAssignmentType.EdgeAttribute
export const DEFAULT_COLUMN_DATA_TYPE = ValueTypeName.String

export const columnAssingmentType2Label = {
  [ColumnAssignmentType.NotImported]: 'Not imported',
  [ColumnAssignmentType.SourceNode]: 'Source node',
  [ColumnAssignmentType.TargetNode]: 'Target node',
  [ColumnAssignmentType.SourceNodeAttribute]: 'Source node attribute',
  [ColumnAssignmentType.TargetNodeAttribute]: 'Target node attribute',
  [ColumnAssignmentType.EdgeAttribute]: 'Edge attribute',
  [ColumnAssignmentType.InteractionType]: 'Interaction type',
}

export const valueTypeName2Label = {
  [ValueTypeName.String]: 'String',
  [ValueTypeName.Long]: 'Long integer',
  [ValueTypeName.Integer]: 'Integer',
  [ValueTypeName.Double]: 'Double',
  [ValueTypeName.Boolean]: 'Boolean',
  [ValueTypeName.ListString]: 'List of strings',
  [ValueTypeName.ListLong]: 'List of long integers',
  [ValueTypeName.ListInteger]: 'List of integers',
  [ValueTypeName.ListDouble]: 'List of floating point numbers',
  [ValueTypeName.ListBoolean]: 'List of booleans',
}

export const validValueTypes = (cat: ColumnAssignmentType): ValueTypeName[] => {
  switch (cat) {
    case ColumnAssignmentType.SourceNode:
    case ColumnAssignmentType.TargetNode: {
      return [ValueTypeName.String, ValueTypeName.Integer, ValueTypeName.Long]
    }
    case ColumnAssignmentType.InteractionType: {
      return [ValueTypeName.String]
    }
    default: {
      return Object.values(ValueTypeName)
    }
  }
}

export const validColumnAssignmentTypes = (
  vtn: ValueTypeName,
): ColumnAssignmentType[] => {
  switch (vtn) {
    case ValueTypeName.String:
      return Object.values(ColumnAssignmentType)
    case ValueTypeName.Long:
    case ValueTypeName.Integer:
    case ValueTypeName.Double:
      return Object.values(ColumnAssignmentType).filter(
        (cat) => cat !== ColumnAssignmentType.InteractionType,
      )
    default:
      return [
        ColumnAssignmentType.NotImported,
        ColumnAssignmentType.EdgeAttribute,
        ColumnAssignmentType.SourceNodeAttribute,
        ColumnAssignmentType.TargetNodeAttribute,
      ]
  }
}

export const updateColumnAssignment = (
  cat: ColumnAssignmentType,
  index: number,
  columns: ColumnAssignmentState[],
): ColumnAssignmentState[] => {
  const nextColumns = [...columns]
  switch (cat) {
    case ColumnAssignmentType.SourceNode:
    case ColumnAssignmentType.TargetNode:
    case ColumnAssignmentType.InteractionType: {
      // There can only be one column assigned to source node/target node/interaction type
      // Reset the previous column with the same meaning back to default meaning
      const prevColumnWithMeaning = nextColumns.findIndex(
        (c) => c.meaning === cat,
      )
      if (prevColumnWithMeaning !== -1) {
        nextColumns[prevColumnWithMeaning] = {
          ...nextColumns[prevColumnWithMeaning],
          meaning: DEFAULT_COLUMN_MEANING,
        }
      }

      const nextColumn = { ...nextColumns[index], meaning: cat }
      nextColumns[index] = nextColumn

      return nextColumns
    }
    default: {
      const nextColumn = { ...nextColumns[index], meaning: cat }
      nextColumns[index] = nextColumn

      return nextColumns
    }
  }
}

export const updateColumnType = (
  vtn: ValueTypeName,
  index: number,
  columns: ColumnAssignmentState[],
  delimiter?: DelimiterType,
): ColumnAssignmentState[] => {
  if (!validValueTypes(columns[index].meaning).includes(vtn)) {
    throw new Error(
      `Invalid value type ${vtn} for column meaning ${columns[index].meaning}`,
    )
  }
  const nextColumns = [...columns]
  const nextColumn = { ...nextColumns[index], dataType: vtn }

  if (delimiter !== undefined) {
    nextColumn.delimiter = delimiter
  }
  nextColumns[index] = nextColumn

  return nextColumns
}

export const selectAllColumns = (
  columns: ColumnAssignmentState[],
): ColumnAssignmentState[] => {
  return columns.map((c) => ({
    ...c,
    dataType: DEFAULT_COLUMN_DATA_TYPE,
    meaning: DEFAULT_COLUMN_MEANING,
    invalidValues: [],
  }))
}

export const unselectAllColumns = (
  columns: ColumnAssignmentState[],
): ColumnAssignmentState[] => {
  return columns.map((c) => ({
    ...c,
    dataType: DEFAULT_COLUMN_DATA_TYPE,
    meaning: ColumnAssignmentType.NotImported,
    invalidValues: [],
  }))
}

export function createNetworkFromTableData(
  rows: DataTableValue[],
  columns: ColumnAssignmentState[],
  uuid?: string,
  name?: string,
): {
  summary: NdexNetworkSummary
  nodeTable: Table
  edgeTable: Table
  network: Network
  visualStyle: VisualStyle
  networkView: NetworkView
} {
  const tgtNodeCol = columns.find(
    (c) => c.meaning === ColumnAssignmentType.TargetNode,
  )
  const srcNodeCol = columns.find(
    (c) => c.meaning === ColumnAssignmentType.SourceNode,
  )
  const interactionTypeCol = columns.find(
    (c) => c.meaning === ColumnAssignmentType.InteractionType,
  )
  const srcNodeAttrCols: ColumnAssignmentState[] = columns.filter(
    (c) => c.meaning === ColumnAssignmentType.SourceNodeAttribute,
  )
  const tgtNodeAttrCols: ColumnAssignmentState[] = columns.filter(
    (c) => c.meaning === ColumnAssignmentType.TargetNodeAttribute,
  )
  const edgeAttrCols = columns.filter(
    (c) => c.meaning === ColumnAssignmentType.EdgeAttribute,
  )

  const nodeTableColumns: ColumnAssignmentState[] = [
    {
      name: 'name',
      dataType: ValueTypeName.String,
      meaning: ColumnAssignmentType.NotImported,
      invalidValues: [] as number[],
    },
    ...srcNodeAttrCols,
    ...tgtNodeAttrCols,
  ]
  const edgeTableColumns = edgeAttrCols.concat(interactionTypeCol ?? [])

  const networkId = uuid ?? uuidv4()

  const edgeTable: Table = {
    id: `${networkId}-edges`,
    columns: edgeTableColumns.map((c) => ({ name: c.name, type: c.dataType })),
    rows: new Map(),
  }
  const nodeTable: Table = {
    id: `${networkId}-nodes`,
    columns: nodeTableColumns.map((c) => ({ name: c.name, type: c.dataType })),
    rows: new Map(),
  }

  const network: Network = {
    id: networkId,
    edges: [],
    nodes: [],
  }

  const visualStyle: VisualStyle = createVisualStyle()

  let nodeIdIndex = 0
  let edgeIdIndex = 0
  const nodeIdMap = new Map<string, number>()
  const edgeIdMap = new Map<string, number>()
  rows.forEach((row) => {
    let srcNodeId: number | undefined = undefined
    let tgtNodeId: number | undefined = undefined
    let eId: number | undefined = undefined
    if (srcNodeCol !== undefined) {
      const nodeName: string = row[srcNodeCol.name]
      const nodeExists = nodeIdMap.has(nodeName)

      const nodeData: Record<string, ValueType> = !nodeExists
        ? { name: nodeName }
        : (nodeTable.rows.get(`${nodeIdMap.get(nodeName)}`) ?? {})
      srcNodeId = !nodeExists
        ? nodeIdIndex++
        : (nodeIdMap.get(nodeName) as number)

      if (!nodeExists) {
        nodeIdMap.set(nodeName, srcNodeId)
        network.nodes.push({ id: `${srcNodeId}` })
      }

      srcNodeAttrCols.forEach((c) => {
        if (nodeData[c.name] === undefined && row[c.name] !== undefined) {
          nodeData[c.name] = parseValue(row[c.name], c.dataType, c.delimiter)
        }
      })

      nodeTable.rows.set(`${srcNodeId}`, nodeData)
    }

    if (tgtNodeCol !== undefined) {
      const nodeName = row[tgtNodeCol.name]
      const nodeExists = nodeIdMap.has(nodeName)

      const nodeData: Record<string, ValueType> = !nodeExists
        ? { name: nodeName }
        : (nodeTable.rows.get(`${nodeIdMap.get(nodeName)}`) ?? {})
      tgtNodeId = !nodeExists
        ? nodeIdIndex++
        : (nodeIdMap.get(nodeName) as number)

      if (!nodeExists) {
        nodeIdMap.set(nodeName, tgtNodeId)
        network.nodes.push({ id: `${tgtNodeId}` })
      }

      tgtNodeAttrCols.forEach((c) => {
        if (nodeData[c.name] === undefined && row[c.name] !== undefined) {
          nodeData[c.name] = parseValue(row[c.name], c.dataType, c.delimiter)
        }
      })

      nodeTable.rows.set(`${tgtNodeId}`, nodeData)
    }

    if (
      srcNodeCol !== undefined &&
      tgtNodeCol !== undefined &&
      srcNodeId !== undefined &&
      tgtNodeId !== undefined
    ) {
      eId = edgeIdIndex
      edgeIdIndex++
      network.edges.push({
        id: `e${eId}`,
        s: `${srcNodeId}`,
        t: `${tgtNodeId}`,
      })
      const rowData: Record<string, any> = {}

      if (interactionTypeCol !== undefined) {
        rowData[interactionTypeCol.name] = row[interactionTypeCol.name]
      }
      edgeAttrCols.forEach((c) => {
        rowData[c.name] = parseValue(row[c.name], c.dataType, c.delimiter)
      })

      edgeTable.rows.set(`e${eId}`, rowData)
    }
  })

  const summary = {
    isNdex: false,
    ownerUUID: networkId,
    name: name ?? 'test',
    isReadOnly: false,
    subnetworkIds: [],
    isValid: false,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: '',
    hasLayout: false,
    hasSample: false,
    cxFileSize: 0,
    cx2FileSize: 0,
    properties: [],
    owner: '',
    version: '',
    completed: false,
    visibility: Visibility.PUBLIC,
    nodeCount: network.nodes.length,
    edgeCount: network.edges.length,
    description: 'test',
    creationTime: new Date(Date.now()),
    externalId: networkId,
    isDeleted: false,
    modificationTime: new Date(Date.now()),
  }

  const networkView = createViewModelFromNetwork(networkId, network)

  visualStyle.nodeLabel.mapping = {
    type: MappingFunctionType.Passthrough,
    attribute: 'name',
    visualPropertyType: VisualPropertyValueTypeName.String,
    defaultValue: '',
  }

  return {
    summary,
    nodeTable,
    edgeTable,
    network,
    visualStyle,
    networkView,
  }
}

export const submitDisabled = (columns: ColumnAssignmentState[]) => {
  const tgtNodeCol = columns.find(
    (c) => c.meaning === ColumnAssignmentType.TargetNode,
  )
  const srcNodeCol = columns.find(
    (c) => c.meaning === ColumnAssignmentType.SourceNode,
  )

  const rowValuesAreValid = columns
    .filter((c) => c.meaning !== ColumnAssignmentType.NotImported)
    .every((c) => c.invalidValues.length === 0)

  return !(
    rowValuesAreValid &&
    (tgtNodeCol !== undefined || srcNodeCol !== undefined)
  )
}
