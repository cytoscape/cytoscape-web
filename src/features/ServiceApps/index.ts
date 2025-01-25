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
  JsonNode,
  CytoContainerRequestId,
} from './model'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import { TableRecord } from '../../models/StoreModel/TableStoreModel'
import { NetworkView } from '../../models/ViewModel'
import { useCallback } from 'react'
import { useAppStore } from '../../store/AppStore'
import { ServiceStatus } from '../../models/AppModel/ServiceStatus'
import { ServiceAppTask } from '../../models/AppModel/ServiceAppTask'
import {
  InputNetwork,
  ServiceInputDefinition,
  Model,
  Format,
  InputColumn,
} from '../../models/AppModel/ServiceInputDefinition'
import { SelectedDataScope } from '../../models/AppModel/SelectedDataScope'
import { SelectedDataType } from '../../models/AppModel/SelectedDataType'
import { OpaqueAspects } from 'src/models/OpaqueAspectModel'

const POLL_INTERVAL = 500 // 0.5 seconds

interface RunTaskProps {
  serviceUrl: string
  algorithmName: string
  customParameters: { [key: string]: string }
  network?: Network
  table?: TableRecord
  visualStyle?: VisualStyle
  summary?: NdexNetworkSummary
  visualStyleOptions?: VisualStyleOptions
  viewModel?: NetworkView
  opaqueAspect?: OpaqueAspects
  serviceInputDefinition?: ServiceInputDefinition
}

interface SubmitAndProcessTaskProps {
  serviceUrl: string
  task: CytoContainerRequest
}

export const createNetworkDataObj = (
  scope: SelectedDataScope,
  inputNetwork: InputNetwork,
  network: Network,
  visualStyle?: VisualStyle,
  summary?: NdexNetworkSummary,
  table?: TableRecord,
  visualStyleOptions?: VisualStyleOptions,
  viewModel?: NetworkView,
  opaqueAspect?: OpaqueAspects,
) => {
  const selectedNodes = new Set(viewModel?.selectedNodes)
  const selectedEdges = new Set(viewModel?.selectedEdges)

  const filterElements = !(
    scope === SelectedDataScope.all ||
    (scope === SelectedDataScope.dynamic &&
      selectedNodes.size === 0 &&
      selectedEdges.size === 0)
  )

  const getFilteredNetwork = (): Network => ({
    id: network.id,
    nodes: network.nodes.filter((node) => selectedNodes.has(node.id)),
    edges: network.edges.filter((edge) => selectedEdges.has(edge.id)),
  })

  if (inputNetwork.format === Format.cx2) {
    if (inputNetwork.model === Model.graph) {
      return exportGraph(filterElements ? getFilteredNetwork() : network)
    } else if (
      inputNetwork.model === Model.network &&
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
        opaqueAspect,
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
  scope: SelectedDataScope,
  selectedElementIds: IdType[],
  columns: InputColumn[],
) => {
  const translatedColumns = columns.map((column) => {
    return {
      id: column.columnName ?? column.defaultColumnName,
      type: column.dataType,
    }
  })

  const filterElements = !(
    scope === SelectedDataScope.all ||
    (scope === SelectedDataScope.dynamic && selectedElementIds.length === 0)
  )

  const filteredRows = filterTable(
    table,
    selectedElementIds,
    columns.map((col) => col.columnName ?? col.defaultColumnName),
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

export const useRunTask = (): ((
  props: RunTaskProps,
) => Promise<CytoContainerResult>) => {
  const { submitAndProcessTask } = useSubmitAndProcessTask()
  const runTask = useCallback(
    async ({
      serviceUrl,
      algorithmName,
      customParameters,
      network,
      visualStyle,
      summary,
      table,
      visualStyleOptions,
      viewModel,
      serviceInputDefinition,
      opaqueAspect,
    }: RunTaskProps): Promise<CytoContainerResult> => {
      // Prepare the task request with user-selected data
      let data: JsonNode = {}
      if (serviceInputDefinition !== undefined) {
        const { type, scope, inputNetwork, inputColumns } =
          serviceInputDefinition
        if (inputNetwork !== null && network !== undefined) {
          data = createNetworkDataObj(
            scope,
            inputNetwork,
            network,
            visualStyle,
            summary,
            table,
            visualStyleOptions,
            viewModel,
            opaqueAspect,
          )
        } else if (inputColumns !== null && table !== undefined) {
          data = createTableDataObj(
            type === SelectedDataType.Node ? table.nodeTable : table.edgeTable,
            scope,
            (type === SelectedDataType.Node
              ? viewModel?.selectedNodes
              : viewModel?.selectedEdges) ?? [],
            inputColumns,
          )
        }
      }

      const taskRequest: CytoContainerRequest = {
        algorithm: algorithmName,
        data: data,
        parameters: customParameters,
      }

      // Submit task and get the result
      const result = await submitAndProcessTask({
        serviceUrl: serviceUrl,
        task: taskRequest,
      })
      return result
    },
    [],
  )
  return runTask
}

export const useSubmitAndProcessTask = (): {
  submitAndProcessTask: (
    props: SubmitAndProcessTaskProps,
  ) => Promise<CytoContainerResult>
} => {
  const setCurrentTask = useAppStore((state) => state.setCurrentTask)
  const submitAndProcessTask = useCallback(
    async ({
      serviceUrl,
      task,
    }: SubmitAndProcessTaskProps): Promise<CytoContainerResult> => {
      // Submit the task
      const taskResponse: CytoContainerRequestId = await submitTask(
        serviceUrl,
        task,
      )
      const taskId = taskResponse.id
      setCurrentTask({
        id: taskId,
        status: ServiceStatus.Submitted,
        progress: 0,
        message: 'Submitted',
      } as ServiceAppTask)
      // Poll the task status until it's done
      while (true) {
        const status: CytoContainerResultStatus = await getTaskStatus(
          serviceUrl,
          taskId,
        )

        if (status.progress === 100) {
          break
        }
        setCurrentTask({
          id: taskId,
          status: ServiceStatus.Processing,
          progress: status.progress,
          message: status.message,
        } as ServiceAppTask)
        // Wait for the polling interval
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
      }

      // Fetch the final task result
      const taskResult: CytoContainerResult = await getTaskResult(
        serviceUrl,
        taskId,
      )

      setCurrentTask({
        id: taskId,
        status: taskResult.status,
        progress: taskResult.progress,
        message: taskResult.message,
      } as ServiceAppTask)

      // Delete the task after fetching the result
      await deleteTask(serviceUrl, taskId)

      return taskResult
    },
    [],
  )
  return { submitAndProcessTask }
}
