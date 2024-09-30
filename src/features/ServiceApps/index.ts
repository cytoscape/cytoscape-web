import {
  deleteTask,
  fetchTaskResult,
  fetchTaskStatus,
  submitTask,
} from './api'
import {
  CommunityDetectionRequest,
  CommunityDetectionResult,
  CommunityDetectionResultStatus,
  JsonNode,
  Task,
} from './model'

const POLL_INTERVAL = 500

export const runTask = async (
  serviceUrl: string,
  algorithmName: string,
  data: JsonNode,
  customParameters?: { [key: string]: string },
): Promise<CommunityDetectionResult> => {
  // Prepare the task request with user-selected data
  const taskRequest: CommunityDetectionRequest = {
    algorithm: algorithmName,
    data: data,
    ...(customParameters && { customParameters }),
  }

  // Submit task and get the result
  const result = await submitAndProcessTask(serviceUrl, taskRequest)
  return result
}

export const submitAndProcessTask = async (
  serviceUrl: string,
  task: CommunityDetectionRequest,
): Promise<CommunityDetectionResult> => {
  // Submit the task
  const taskResponse: Task = await submitTask(serviceUrl, task)
  const taskId = taskResponse.id

  // Poll the task status until it's done
  while (true) {
    const status: CommunityDetectionResultStatus = await fetchTaskStatus(
      serviceUrl,
      taskId,
    )

    if (status.progress === 100) {
      break
    }

    // Wait for the polling interval
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
  }

  // Fetch the final task result
  const taskResult: CommunityDetectionResult = await fetchTaskResult(
    serviceUrl,
    taskId,
  )
  // Delete the task after fetching the result
  await deleteTask(serviceUrl, taskId)

  return taskResult
}
