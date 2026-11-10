import type { ParsedRow } from '@/features/TableDataLoader/model/ParsedRow'
import { v4 as uuidv4 } from 'uuid'

import { CyNetwork } from '../../../../models/CyNetworkModel'
import { Network } from '../../../../models/NetworkModel'
import { NetworkSummary } from '../../../../models/NetworkSummaryModel'
import { createNetworkSummary } from '../../../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import { Table, ValueType, ValueTypeName } from '../../../../models/TableModel'
import {
  assertSameColumnType,
  columnNamesMatch,
  DeclaredColumn,
  mergeDeclaredColumns,
  setCellValue,
} from '../../../../models/TableModel/impl/columnNames'
import { valueTypeNameLabel } from '../../../../models/TableModel/impl/valueTypeNameDisplay'
import { createViewModel } from '../../../../models/ViewModel/impl/viewModelImpl'
import {
  MappingFunctionType,
  VisualPropertyValueTypeName,
  VisualStyle,
} from '../../../../models/VisualStyleModel'
import { createVisualStyle } from '../../../../models/VisualStyleModel/impl/visualStyleFnImpl'
import { VisualStyleOptions } from '../../../../models/VisualStyleModel/VisualStyleOptions'
import { ColumnAssignmentState } from '../ColumnAssignmentState'
import { ColumnAssignmentType } from '../ColumnAssignmentType'
import { DelimiterType } from '../DelimiterType'
import { parseValue } from './ParseValues'

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

// Sourced from the shared data-type display module (CW-562) so labels stay
// consistent with the rest of the app. Kept as an object map for existing
// `valueTypeName2Label[type]` call sites.
export const valueTypeName2Label: Record<ValueTypeName, string> = Object.values(
  ValueTypeName,
).reduce(
  (acc, t) => {
    acc[t] = valueTypeNameLabel(t)
    return acc
  },
  {} as Record<ValueTypeName, string>,
)

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

/** A file column and how it is declared for merging */
interface TabularColumn extends DeclaredColumn {
  readonly source: ColumnAssignmentState
}

const declareColumn = (c: ColumnAssignmentState): TabularColumn => ({
  name: c.name,
  type: c.dataType,
  source: c,
})

// In a column shared by several spellings, an empty cell means "no value"
const isEmptyCell = (value: unknown): boolean =>
  value === undefined || value === null || value === ''

export function createNetworkFromTableData(
  rows: ParsedRow[],
  columns: ColumnAssignmentState[],
  uuid?: string,
  name?: string,
): {
  cyNetwork: CyNetwork
  summary: NetworkSummary
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

  const nodeNameColumn: ColumnAssignmentState = {
    name: 'name',
    dataType: ValueTypeName.String,
    meaning: ColumnAssignmentType.NotImported,
    invalidValues: [] as number[],
  }

  // Columns of one name merge, as in Cytoscape Desktop: the first declared
  // keeps its spelling and type, in file order. The built-in name column
  // comes before any file column.
  const nodeAttributeColumnsInFileOrder = columns.filter(
    (c) =>
      c.meaning === ColumnAssignmentType.SourceNodeAttribute ||
      c.meaning === ColumnAssignmentType.TargetNodeAttribute,
  )
  const nodeColumnMerge = mergeDeclaredColumns(
    [nodeNameColumn, ...nodeAttributeColumnsInFileOrder].map(declareColumn),
  )
  const edgeColumnsInFileOrder = columns.filter(
    (c) =>
      c.meaning === ColumnAssignmentType.EdgeAttribute ||
      c === interactionTypeCol,
  )
  const edgeColumnMerge = mergeDeclaredColumns(
    edgeColumnsInFileOrder.map(declareColumn),
  )

  const nodeTableColumns: ColumnAssignmentState[] = [
    nodeNameColumn,
    ...srcNodeAttrCols,
    ...tgtNodeAttrCols,
  ].filter((c) => nodeColumnMerge.keptColumn(c.name)?.source === c)
  const edgeTableColumns = edgeAttrCols
    .concat(interactionTypeCol ?? [])
    .filter((c) => edgeColumnMerge.keptColumn(c.name)?.source === c)

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
  // Nodes whose name is still the node column's value. The first explicit
  // value of a column merged into `name` replaces it, in whichever row and
  // role the node was first seen.
  const nodeColumnNames = new Set<number>()

  const ensureNode = (nodeName: string): number => {
    const known = nodeIdMap.get(nodeName)
    if (known !== undefined) return known
    const nodeId = nodeIdIndex++
    nodeIdMap.set(nodeName, nodeId)
    network.nodes.push({ id: `${nodeId}` })
    nodeTable.rows.set(`${nodeId}`, { name: nodeName })
    nodeColumnNames.add(nodeId)
    return nodeId
  }

  rows.forEach((row) => {
    const srcNodeId: number | undefined =
      srcNodeCol === undefined ? undefined : ensureNode(row[srcNodeCol.name])
    const tgtNodeId: number | undefined =
      tgtNodeCol === undefined ? undefined : ensureNode(row[tgtNodeCol.name])
    let eId: number | undefined = undefined

    // This row's node values, per node and in file order across the source
    // and target roles, so in a merged column the last value wins even when
    // both ends are the same node
    const incoming = new Map<number, Map<string, ValueType>>()
    nodeAttributeColumnsInFileOrder.forEach((c) => {
      const isSource = c.meaning === ColumnAssignmentType.SourceNodeAttribute
      const nodeId = isSource ? srcNodeId : tgtNodeId
      const nodeColumn = isSource ? srcNodeCol : tgtNodeCol
      const raw = row[c.name]
      const kept = nodeColumnMerge.keptColumn(c.name)
      if (
        nodeId === undefined ||
        nodeColumn === undefined ||
        raw === undefined ||
        kept === undefined
      ) {
        return
      }
      if (nodeColumnMerge.isMerged(c.name)) {
        if (isEmptyCell(raw)) return
        assertSameColumnType(kept, declareColumn(c))
        // The node column's own value comes later in the file, so it wins
        if (
          kept.source === nodeNameColumn &&
          columnNamesMatch(nodeColumn.name, nodeNameColumn.name) &&
          columns.indexOf(c) < columns.indexOf(nodeColumn)
        ) {
          return
        }
      }
      let values = incoming.get(nodeId)
      if (values === undefined) {
        values = new Map()
        incoming.set(nodeId, values)
      }
      values.set(kept.name, parseValue(raw, c.dataType, c.delimiter))
    })

    // A value from an earlier row is kept, except a name that is still the
    // node column's value
    incoming.forEach((values, nodeId) => {
      const nodeData = nodeTable.rows.get(`${nodeId}`) as Record<
        string,
        ValueType
      >
      values.forEach((value, name) => {
        const isName = name === nodeNameColumn.name
        if (isName && nodeColumnNames.has(nodeId)) {
          nodeColumnNames.delete(nodeId)
        } else if (Object.hasOwn(nodeData, name)) {
          return
        }
        setCellValue(nodeData, name, value)
      })
    })

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

      edgeColumnsInFileOrder.forEach((c) => {
        const raw = row[c.name]
        const kept = edgeColumnMerge.keptColumn(c.name) as TabularColumn
        if (edgeColumnMerge.isMerged(c.name)) {
          if (isEmptyCell(raw)) return
          assertSameColumnType(kept, declareColumn(c))
        }
        setCellValue(
          rowData,
          kept.name,
          c === interactionTypeCol
            ? raw
            : parseValue(raw, c.dataType, c.delimiter),
        )
      })

      edgeTable.rows.set(`e${eId}`, rowData)
    }
  })

  const summary = createNetworkSummary({
    networkId: network.id,
    name: name ?? 'test',
    nodeCount: network.nodes.length,
    edgeCount: network.edges.length,
  })

  const networkView = createViewModel(network)

  visualStyle.nodeLabel.mapping = {
    type: MappingFunctionType.Passthrough,
    attribute: 'name',
    visualPropertyType: VisualPropertyValueTypeName.String,
    defaultValue: '',
  }

  // Build visualEditorProperties for UI table display
  const visualStyleOptions: VisualStyleOptions = {
    visualEditorProperties: {
      nodeSizeLocked: false,
      arrowColorMatchesEdge: false,
      tableDisplayConfiguration: {
        nodeTable: {
          columnConfiguration: nodeTableColumns.map((c) => ({
            attributeName: c.name,
            visible: true,
          })),
        },
        edgeTable: {
          columnConfiguration: edgeTableColumns.map((c) => ({
            attributeName: c.name,
            visible: true,
          })),
        },
      },
    },
  }

  // Create CyNetwork from all components
  const cyNetwork: CyNetwork = {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkViews: [networkView],
    visualStyleOptions,
    undoRedoStack: {
      undoStack: [],
      redoStack: [],
    },
  }

  return {
    cyNetwork,
    summary,
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
