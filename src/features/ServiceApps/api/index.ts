import {
  CommunityDetectionAlgorithms,
  CommunityDetectionRequest,
  CommunityDetectionResult,
  CommunityDetectionResultsStatus,
  ErrorResponse,
  ServerStatus,
  ServiceMetaData,
  Task,
} from '../model'

const serviceUrl = 'http://cd.ndexbio.org/cd/communitydetection/v1'

// fetch algorithms function
export const fetchAlgorithms = async (
  serviceUrl: string,
): Promise<CommunityDetectionAlgorithms> => {
  const response = await fetch(`${serviceUrl}/algorithms`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }

  const data: CommunityDetectionAlgorithms = await response.json()
  return data
}

// delete task function
export const deleteTask = async (
  serviceUrl: string,
  taskId: string,
): Promise<void> => {
  const response = await fetch(`${serviceUrl}/${taskId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }
}
// submit task function
export const submitTask = async (
  serviceUrl: string,
  task: CommunityDetectionRequest,
): Promise<Task> => {
  const response = await fetch(serviceUrl, {
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

// fetch task result function
export const fetchTaskResult = async (
  serviceUrl: string,
  taskId: string,
): Promise<CommunityDetectionResult> => {
  const response = await fetch(`${serviceUrl}/${taskId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }
  const result: CommunityDetectionResult = await response.json()
  return result
}

export const fetchTaskRawResult = async (
  serviceUrl: string,
  taskId: string,
): Promise<any> => {
  const response = await fetch(`${serviceUrl}/raw/${taskId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }
  const rawResult = await response.json()
  return rawResult
}

// fetch task status function
export const fetchTaskStatus = async (
  serviceUrl: string,
  taskId: string,
): Promise<CommunityDetectionResultsStatus> => {
  const response = await fetch(`${serviceUrl}/${taskId}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }
  const status: CommunityDetectionResultsStatus = await response.json()
  return status
}

// get server status function
export const fetchServerStatus = async (
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

// get meta data of the service
export const fetchServiceMetaData = async (
  serviceUrl: string,
): Promise<ServiceMetaData> => {
  const response = await fetch(`${serviceUrl}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const errorResponse: ErrorResponse = await response.json()
    throw new Error(errorResponse.message)
  }
  const status: ServiceMetaData = await response.json()
  return status
}
