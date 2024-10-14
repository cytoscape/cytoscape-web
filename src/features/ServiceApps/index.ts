import { exportNetworkToCx2, exportGraph } from '../../store/io/exportCX'
import {
  Table,
  IdType,
  AttributeName,
  ValueType,
  Network,
  VisualStyle,
  NdexNetworkSummary,
} from '../../models'
import { deleteTask, getTaskResult, getTaskStatus, submitTask } from './api'
import {
  CytoContainerRequest,
  CytoContainerResult,
  CytoContainerResultStatus,
  InputColumn,
  InputNetwork,
  TableDataObject,
  JsonNode,
  CytoContainerRequestId,
  ScopeType,
  InputDataType,
} from './model'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import { TableRecord } from '../../models/StoreModel/TableStoreModel'
import { NetworkView } from '../../models/ViewModel'

const POLL_INTERVAL = 500 // 0.5 seconds

export const createNetworkDataObj = (
  scope: ScopeType,
  inputNetwork: InputNetwork,
  network: Network,
  visualStyle?: VisualStyle,
  summary?: NdexNetworkSummary,
  table?: TableRecord,
  visualStyleOptions?: VisualStyleOptions,
  viewModel?: NetworkView,
) => {
  const selectedNodes = new Set(viewModel?.selectedNodes)
  const selectedEdges = new Set(viewModel?.selectedEdges)

  const filterElements = !(
    scope === ScopeType.all ||
    (scope === ScopeType.dynamic &&
      selectedNodes.size === 0 &&
      selectedEdges.size === 0)
  )

  const getFilteredNetwork = (): Network => ({
    id: network.id,
    nodes: network.nodes.filter((node) => selectedNodes.has(node.id)),
    edges: network.edges.filter((edge) => selectedEdges.has(edge.id)),
  })

  if (inputNetwork.format === 'cx2') {
    if (inputNetwork.model === 'graph') {
      return exportGraph(filterElements ? getFilteredNetwork() : network)
    } else if (
      inputNetwork.model === 'network' &&
      visualStyle &&
      summary &&
      table
    ) {
      const filteredNetwork = filterElements ? getFilteredNetwork() : network
      const filteredSummary = filterElements
        ? {
            ...summary,
            nodeCount: selectedNodes.size,
            edgeCount: selectedEdges.size,
          }
        : summary
      return exportNetworkToCx2(
        filteredNetwork,
        visualStyle,
        filteredSummary,
        table.nodeTable,
        table.edgeTable,
        visualStyleOptions,
        viewModel,
        summary.name,
      )
    } else {
      throw new Error('Illegal Input')
    }
  } else {
    // output edgelist format
    throw new Error('Not implemented')
  }
}

export const createTableDataObj = (
  table: Table,
  scope: ScopeType,
  selectedElementIds: IdType[],
  columns: InputColumn[],
): TableDataObject => {
  const translatedColumns = columns.map((column) => {
    return {
      id: column.name,
      type: column.dataType,
    }
  })

  const filterElements = !(
    scope === ScopeType.all ||
    (scope === ScopeType.dynamic && selectedElementIds.length === 0)
  )

  const filteredRows = filterTable(
    table,
    selectedElementIds,
    columns.map((col) => col.name),
    filterElements,
  )
  return {
    columns: translatedColumns,
    rows: filteredRows,
  }
}

const filterTable = (
  table: Table,
  selectedNodeIds: IdType[], // List of node IDs to filter
  selectedColumns: AttributeName[], // List of columns to filter
  filterElements: boolean = true,
): Record<IdType, Record<AttributeName, ValueType>> => {
  if (filterElements) {
    return selectedNodeIds.reduce(
      (acc, nodeId) => {
        const row = table.rows.get(nodeId)
        if (row) {
          // Filter the columns for the current row
          const filteredRow = selectedColumns.reduce(
            (colAcc, columnName) => {
              if (row.hasOwnProperty(columnName)) {
                colAcc[columnName] = row[columnName]
              }
              return colAcc
            },
            {} as Record<AttributeName, ValueType>,
          )

          acc[nodeId] = filteredRow
        }
        return acc
      },
      {} as Record<IdType, Record<AttributeName, ValueType>>,
    )
  } else {
    // only reduce on the selected columns
    return Array.from(table.rows.entries()).reduce(
      (acc, [nodeId, row]) => {
        const filteredRow = selectedColumns.reduce(
          (colAcc, columnName) => {
            if (row.hasOwnProperty(columnName)) {
              colAcc[columnName] = row[columnName]
            }
            return colAcc
          },
          {} as Record<AttributeName, ValueType>,
        )

        acc[nodeId] = filteredRow
        return acc
      },
      {} as Record<IdType, Record<AttributeName, ValueType>>,
    )
  }
}

export const runTask = async (
  serviceUrl: string,
  algorithmName: string,
  data: JsonNode,
  customParameters?: { [key: string]: string },
): Promise<CytoContainerResult> => {
  // Prepare the task request with user-selected data
  const taskRequest: CytoContainerRequest = {
    algorithm: algorithmName,
    data: data,
    ...(customParameters && { customParameters }),
  }

  // Submit task and get the result
  const result = await submitAndProcessTask(
    serviceUrl,
    algorithmName,
    taskRequest,
  )
  return result
}

export const submitAndProcessTask = async (
  serviceUrl: string,
  algorithmName: string,
  task: CytoContainerRequest,
): Promise<CytoContainerResult> => {
  // Submit the task
  const taskResponse: CytoContainerRequestId = await submitTask(serviceUrl, task)
  const taskId = taskResponse.id

  // Poll the task status until it's done
  while (true) {
    const status: CytoContainerResultStatus = await getTaskStatus(
      serviceUrl,
      algorithmName,
      taskId,
    )

    if (status.progress === 100) {
      break
    }

    // Wait for the polling interval
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
  }

  // Fetch the final task result
  const taskResult: CytoContainerResult = await getTaskResult(
    serviceUrl,
    algorithmName,
    taskId,
  )
  // Delete the task after fetching the result
  await deleteTask(serviceUrl, algorithmName, taskId)

  return taskResult
}
