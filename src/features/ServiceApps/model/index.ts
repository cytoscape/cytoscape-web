import { AttributeName, ValueType } from '../../../models'
import { ServiceAppAction } from '../../../models/AppModel/ServiceAppAction'
enum ServerStatusType {
  ok = 'ok',
  error = 'error',
}

enum AlgorithmValidationType {
  number = 'number',
  digits = 'digits',
  string = 'string',
}

enum inputNetworkModel {
  network = 'network',
  graph = 'graph',
}

enum inputNetworkFormat {
  cx2 = 'cx2',
}

enum AlgorithmParameterType {
  text = 'text',
  dropDown = 'dropDown',
  radio = 'radio',
  checkBox = 'checkBox',
  nodeColumn = 'nodeColumn',
  edgeColumn = 'edgeColumn',
}

export enum ScopeType{
  dynamic = 'dynamic',
  selected = 'selected',
  all = 'all',
}

export enum InputDataType {
  nodes = 'nodes',
  edges = 'edges',
  network = 'network',
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
  cyWebAction: ServiceAppAction
  cyWebMenuItem: CyWebMenuItem
  description: string
  serviceInputDefinition: ServiceInputDefinition
}

interface AlgorithmParameter {
  displayName: string
  description: string
  type: AlgorithmParameterType
  valueList: string[]
  defaultValue: string
  validationType: AlgorithmValidationType
  validationHelp: string
  validationRegex: string
  minValue: number
  maxValue: number
}

export interface CyWebMenuItem{
  root: string,
  path: CyWebMenuItemPath[]
}

export interface CyWebMenuItemPath{
  name: string
  gravity: number
}

export interface InputColumn{
  name: string
  description: string
  dataType: string
  columnName: string
  defaultColumnName?: string
}

export interface InputNetwork {
  model: inputNetworkModel
  format: inputNetworkFormat
}

export interface ServiceInputDefinition{
  type: string,
  scope: string,
  inputColumns: InputColumn[]
  inputNetworks: InputNetwork[]
}

export interface CytoContainerResult {
  id: string
  status: string
  message: string
  progress: number
  wallTime: number
  startTime: number
  result: JsonNode
}

export interface CytoContainerResultStatus {
  id: string
  status: string
  message: string
  progress: number
  wallTime: number
  startTime: number
}

export interface JsonNode {
  [key: string]: any
}

export interface CytoContainerRequestId {
  id: string
}

export interface CytoContainerRequest {
  algorithm: string
  data: JsonNode
  parameters?: { [key: string]: string }
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

interface ColumnForServer {
  id: string
  type: string
}

export interface TableDataObject {
  columns: ColumnForServer[]
  rows: Record<string, Record<AttributeName, ValueType>>
}
