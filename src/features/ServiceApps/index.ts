import { Table, IdType } from '../../models'
import { deleteTask, getTaskResult, getTaskStatus, submitTask } from './api'
import {
  CytoContainerRequest,
  CytoContainerResult,
  CytoContainerResultStatus,
  InputColumn,
  InputNetwork,
  JsonNode,
  Task,
} from './model'

const POLL_INTERVAL = 500 // 0.5 seconds

export const createDataObject = async (
  table:Table,
  type: string,
  scope: string,
  inputColumns: InputColumn[],
) => {
  
  return
}

const serializeColumns = (table: Table,columns: InputColumn[]): JsonNode => {
  const serializedColumns = columns.map((column) => {
    return {
      id: column.name,
      type: column.dataType,
    }
  })

  const rows = table.rows.map((row) => {
    return 
  })
  return {
    columns: {serializedColumns},
    rows: {}
  }
}
           
function filterTable(
  table: Table,
  selectedNodeIds: IdType[],   // List of node IDs to filter
  selectedColumns: AttributeName[] // List of columns to filter
): Record<IdType,Record<AttributeName, ValueType>> {
  // Step 1 & 2: Use reduce to filter both rows and columns
  return selectedNodeIds.reduce((acc, nodeId) => {
    const row = table.rows.get(nodeId);
    if (row) {
      // Filter the columns for the current row
      const filteredRow = selectedColumns.reduce((colAcc, columnName) => {
        if (row.hasOwnProperty(columnName)) {
          colAcc[columnName] = row[columnName];
        }
        return colAcc;
      }, {} as Partial<Record<AttributeName, ValueType>>);

      acc[nodeId] = filteredRow;
    }
    return acc;
  }, {} as Record<IdType, Partial<Record<AttributeName, ValueType>>>);
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
  const taskResponse: Task = await submitTask(serviceUrl, algorithmName, task)
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
