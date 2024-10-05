import {
  ErrorResponse,
  CytoContainerResult,
  ServiceAlgorithm,
  CytoContainerRequest,
  Task,
  CytoContainerResultStatus,
  ServerStatus
} from '../model'

const serviceUrl = 'https://cd.ndexbio.org/cd/communitydetection/v1'

// get task result function
export const getTaskResult = async (
  serviceUrl: string,
  algorithmName: string,
  taskId: string,
): Promise<CytoContainerResult> => {
  const response = await fetch(`${serviceUrl}/${algorithmName}/${taskId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }

  const data: CytoContainerResult = await response.json()
  return data
}

// delete task function
export const deleteTask = async (
  serviceUrl: string,
  algorithmName: string,
  taskId: string,
): Promise<void> => {
  const response = await fetch(`${serviceUrl}/${algorithmName}/${taskId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }
}

// get meta data about this service algorithm
export const getAlgorithmMetaData = async (
  serviceUrl: string,
  algorithmName: string,
): Promise<ServiceAlgorithm> => {
  const response = await fetch(`${serviceUrl}/${algorithmName}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }
  const data: ServiceAlgorithm = await response.json()
  return data
}

// submit task function
export const submitTask = async (
  serviceUrl: string,
  task: CytoContainerRequest,
): Promise<Task> => {
  const response = await fetch(`${serviceUrl}/${task.algorithm}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  })
  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }
  const result: Task = await response.json()
  return result
}

// get task status function
export const getTaskStatus = async (
  serviceUrl: string,
  algorithmName: string,
  taskId: string,
): Promise<CytoContainerResultStatus> => {
  const response = await fetch(`${serviceUrl}/${algorithmName}/${taskId}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }
  const status: CytoContainerResultStatus = await response.json()
  return status
}

// get server status function
export const getServerStatus = async (
  serviceUrl: string,
): Promise<ServerStatus> => {
  const response = await fetch(`${serviceUrl}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }
  const status: ServerStatus = await response.json()
  return status
}

// get algorithm status function
export const getAlgorithmStatus = async (
  serviceUrl: string,
  algorithmName: string,
): Promise<ServerStatus> => {
  const response = await fetch(`${serviceUrl}/${algorithmName}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }
  const status: ServerStatus = await response.json()
  return status
}
