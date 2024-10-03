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

const POLL_INTERVAL = 500

export const assemblInputData = async (
  type: string,
  scope: string,
  inputColumns: InputColumn[],
  inputNetwork: InputNetwork
) => {
  
  return
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
