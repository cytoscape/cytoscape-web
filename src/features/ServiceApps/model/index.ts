enum ServerStatusType {
  ok = 'ok',
  error = 'error',
}

enum AlgorithmType {
  value = 'value',
  flag = 'flag',
}

enum AlgorithmValidationType {
  number = 'number',
  digits = 'digits',
  string = 'string',
}

export interface ErrorResponse {
  errorCode: string
  message: string
  description: string
  stackTrace: string
  threadId: string
  timestamp: string
}

export interface ServiceAlgorithm {
  name: string
  parameters: AlgorithmParameter[]
  version: string
  action: string
  rootMenu: string
  description: string
  selectedData: SelectedData
}

export interface AlgorithmParameter {
  displayName: string
  description: string
  type: AlgorithmType
  valueList: string[]
  defaultValue: string
  validationType: AlgorithmValidationType
  validationHelp: string
  validationRegex: string
  minValue: number
  maxValue: number
  flag:string
}

export interface SelectedData {
  type: string
  parameters: SelectedDataParameter[]
  scope: string
}

export interface SelectedDataParameter{
  name: string
  format: string
  description: string
  dataType: string
  model: string
}

export interface CytoContainerResult{
  id: string
  status: string
  message: string
  progress: number
  wallTime: number
  startTime: number
  result: JsonNode
}

export interface CytoContainerResultStatus{
  id: string
  status: string
  message: string
  progress: number
  wallTime: number
  startTime: number
}

export interface JsonNode {
  [key: string]: any; 
}

export interface Task {
  id: string
}

export interface CytoContainerRequest {
  algorithm: string
  data: JsonNode
  customParameters?: { [key: string]: string }
}

export interface ServerStatus {
  status: ServerStatusType
  pcDiskFull: number
  load: [number, number, number]
  queuedTasks: number
  completedTasks: number
  canceledTasks: number
  version: string
}