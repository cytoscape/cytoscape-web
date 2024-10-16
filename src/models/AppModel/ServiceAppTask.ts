import { ServiceStatus } from './ServiceStatus'

export interface ServiceAppTask {
  // ID of the remote task
  id: string

  // Status of the task (see ServiceStatus)
  status: ServiceStatus

  // Message from the service
  message: string

  // Progress of the task (0-100)
  progress: number
}
