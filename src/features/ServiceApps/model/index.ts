enum NodeType {
  ARRAY = 'ARRAY',
  BINARY = 'BINARY',
  BOOLEAN = 'BOOLEAN',
  MISSING = 'MISSING',
  NULL = 'NULL',
  NUMBER = 'NUMBER',
  OBJECT = 'OBJECT',
  POJO = 'POJO',
  STRING = 'STRING',
}

enum ServerStatusType {
  ok = 'ok',
  error = 'error',
}

enum AlgorithmType{
    value = 'value',
    flag= 'flag',
}

enum AlgorithmValidationType{
    number = 'number',
    digits = 'digits',
    string = 'string',
}

export interface CommunityDetectionAlgorithm {
  name: string
  displayName: string
  description: string
  version: string
  dockerImage: string
  inputDataFormat: string
  outputDataFormat: string
  rawResultContentType: string
  binaryResult: boolean
  customParameters: CustomParameter[]
}

export interface CustomParameter {
  name: string
  displayName: string
  description: string
  type: string
  defaultValue: string
  validationType: string
  validationHelp: string
  validationRegex: string
  minValue: number
  maxValue: number
}

export interface CommunityDetectionAlgorithms {
  algorithms: { [key: string]: CommunityDetectionAlgorithm }
}

export interface ErrorResponse {
  errorCode: string
  message: string
  description: string
  stackTrace: string
  threadId: string
  timestamp: string
}

export interface JsonNode {
  float: boolean
  array: boolean
  empty: boolean
  null: boolean
  valueNode: boolean
  containerNode: boolean
  missingNode: boolean
  object: boolean
  nodeType: NodeType
  pojo: boolean
  number: boolean
  integralNumber: boolean
  floatingPointNumber: boolean
  short: boolean
  int: boolean
  long: boolean
  double: boolean
  bigDecimal: boolean
  bigInteger: boolean
  textual: boolean
  boolean: boolean
  binary: boolean
}

export interface Task {
  id: string
}

export interface CommunityDetectionRequest {
  algorithm: string
  data: JsonNode
  customParameters?: { [key: string]: string }
}

export interface CommunityDetectionResult {
  id: string
  status: string
  message: string
  progress: number
  wallTime: number
  startTime: number
  result: JsonNode
}

export interface AlgorithmCustomParameter {
    displayName: string
    description: string
    type: AlgorithmType
    defaultValue: string
    validationType: AlgorithmValidationType
    validationHelp: string
    validationRegex: string
    minValue: number
    maxValue: number
}

export interface ServiceAlgorithm {
  name: string
  displayName: string
  description: string
  version: string
  parameters: AlgorithmCustomParameter[]
}

export interface ServiceMetaData {
  algorthms: ServiceAlgorithm[]
  name: string
  description: string
  inputDataFormat: string
  outputDataFormat: string
}

export interface CommunityDetectionResultStatus {
  id: string
  status: string
  message: string
  progress: number
  wallTime: number
  startTime: number
}

export interface ServerStatus {
  status: ServerStatusType
  pcDiskFull: number
  load: [number, number, number]
  queuedTasks: number
  completedTasks: number
  canceledTasks: number
  restVersion: string
}
