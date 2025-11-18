import { z } from 'zod'

import type { ComponentMetadata } from '../../models/AppModel/ComponentMetadata'
import type { CyApp } from '../../models/AppModel/CyApp'
import type { CyWebMenuItem } from '../../models/AppModel/CyWebMenuItem'
import type { MenuPathElement } from '../../models/AppModel/MenuPathElement'
import type { ServiceApp } from '../../models/AppModel/ServiceApp'
import type { ServiceAppAction } from '../../models/AppModel/ServiceAppAction'
import type { ServiceAppParameter } from '../../models/AppModel/ServiceAppParameter'
import type {
  InputColumn,
  InputNetwork,
  ServiceInputDefinition,
} from '../../models/AppModel/ServiceInputDefinition'
import type { FilterConfig } from '../../models/FilterModel/FilterConfig'
import type { Edge, Network, Node } from '../../models/NetworkModel'
import type { NetworkProperty } from '../../models/NetworkSummaryModel/NetworkProperty'
import type { NetworkSummary } from '../../models/NetworkSummaryModel/NetworkSummary'
import type { OpaqueAspects } from '../../models/OpaqueAspectModel/OpaqueAspects'
import type { Edit,UndoRedoStack } from '../../models/StoreModel/UndoStoreModel'
import type { Column } from '../../models/TableModel/Column'
import type { Table } from '../../models/TableModel/Table'
import type { NetworkBrowserPanelUIState } from '../../models/UiModel/NetworkBrowserPanelState'
import type { NetworkViewUIState } from '../../models/UiModel/NetworkViewUI'
import { Panel } from '../../models/UiModel/Panel'
import type { ColumnUIState,TableUIState } from '../../models/UiModel/TableUi'
import type { Ui } from '../../models/UiModel/Ui'
import type { NetworkView } from '../../models/ViewModel/NetworkView'
import type {
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
} from '../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'
import type { DiscreteMappingFunction } from '../../models/VisualStyleModel/VisualMappingFunction/DiscreteMappingFunction'
import { MappingFunctionType } from '../../models/VisualStyleModel/VisualMappingFunction/MappingFunctionType'
import type { VisualMappingFunction } from '../../models/VisualStyleModel/VisualMappingFunction/VisualMappingFunction'
import type { VisualProperty } from '../../models/VisualStyleModel/VisualProperty'
import type { VisualStyle } from '../../models/VisualStyleModel/VisualStyle'
import type {
  ColumnConfiguration,
  TableConfig,
  TableDisplayConfiguration,
  VisualEditorProperties,
  VisualStyleOptions,
} from '../../models/VisualStyleModel/VisualStyleOptions'
import type { Workspace } from '../../models/WorkspaceModel/Workspace'
import type { OpaqueAspectsDB, UndoRedoStackDB } from './index'
import type {
  FilterConfigWithRecords,
  NetworkViewWithRecords,
  TableWithRecords,
  VisualStyleWithRecords,
} from './serialization'

const IdTypeSchema = z.string().min(1)

const DateSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  return value
}, z.date())

const ValueTypeSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
  z.array(z.boolean()),
])

const ColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
})

const TableRowSchema = z.record(z.string(), ValueTypeSchema)

const MapEntriesSchema = z.array(z.tuple([z.any(), z.any()]))

const NodeSchema = z
  .object({
    id: IdTypeSchema,
  })
  .passthrough()

const EdgeSchema = z
  .object({
    id: IdTypeSchema,
    s: IdTypeSchema,
    t: IdTypeSchema,
  })
  .passthrough()

const NetworkSchema = z.object({
  id: IdTypeSchema,
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
})

const TableSchema = z.object({
  id: IdTypeSchema,
  columns: z.array(ColumnSchema),
  rows: z.instanceof(Map).superRefine((rows, ctx) => {
    for (const [key, value] of rows.entries()) {
      if (typeof key !== 'string') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Table row key must be a string ID',
        })
        return
      }
      const result = TableRowSchema.safeParse(value)
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Table row values must be an attribute record',
        })
        return
      }
    }
  }),
})

const TableWithRecordsSchema = z.object({
  id: IdTypeSchema,
  columns: z.array(ColumnSchema),
  rows: z.array(z.tuple([IdTypeSchema, TableRowSchema])),
})

const ContinuousFunctionControlPointSchema = z.object({
  value: ValueTypeSchema,
  vpValue: z.unknown(),
  inclusive: z.boolean().optional(),
})

const VisualMappingFunctionBaseSchema = z.object({
  type: z.string(),
  attribute: z.string(),
  visualPropertyType: z.string(),
  defaultValue: z.unknown(),
  attributeType: z.string().optional(),
})

const DiscreteMappingFunctionSchema = VisualMappingFunctionBaseSchema.extend({
  type: z.literal(MappingFunctionType.Discrete).or(z.string()),
  vpValueMap: z.instanceof(Map).or(MapEntriesSchema),
})

const ContinuousMappingFunctionSchema = VisualMappingFunctionBaseSchema.extend({
  type: z.literal(MappingFunctionType.Continuous).or(z.string()),
  min: ContinuousFunctionControlPointSchema,
  max: ContinuousFunctionControlPointSchema,
  controlPoints: z.array(ContinuousFunctionControlPointSchema),
  gtMaxVpValue: z.unknown(),
  ltMinVpValue: z.unknown(),
})

const VisualMappingFunctionSchema = z.union([
  DiscreteMappingFunctionSchema,
  ContinuousMappingFunctionSchema,
  VisualMappingFunctionBaseSchema.extend({
    type: z.literal(MappingFunctionType.Passthrough).or(z.string()),
  }),
])

const VisualPropertySchema = z.object({
  name: z.string(),
  group: z.string(),
  displayName: z.string(),
  type: z.string(),
  defaultValue: z.unknown(),
  mapping: VisualMappingFunctionSchema.optional(),
  bypassMap: z.instanceof(Map).or(MapEntriesSchema),
  tooltip: z.string().optional(),
  maxVal: z.number().optional(),
})

const VisualStyleSchema = z.record(VisualPropertySchema)

const TableUIColumnSchema = z.object({
  width: z.number(),
  visible: z.boolean().optional(),
  order: z.number().optional(),
})

const TableUIStateSchema = z.object({
  columnUiState: z.record(TableUIColumnSchema),
  activeTabIndex: z.number(),
})

const NetworkBrowserPanelStateSchema = z.object({
  activeTabIndex: z.number(),
})

const NetworkViewUiStateSchema = z.object({
  activeTabIndex: z.number(),
})

const ColumnConfigurationSchema = z.object({
  attributeName: z.string(),
  visible: z.boolean(),
  columnWidth: z.number().optional(),
})

const TableConfigSchema = z.object({
  columnConfiguration: z.array(ColumnConfigurationSchema),
  sortColumn: z.string().optional(),
  sortDirection: z.enum(['ascending', 'descending']).optional(),
})

const TableDisplayConfigurationSchema = z.object({
  nodeTable: TableConfigSchema,
  edgeTable: TableConfigSchema,
})

const VisualEditorPropertiesSchema = z.object({
  nodeSizeLocked: z.boolean(),
  arrowColorMatchesEdge: z.boolean(),
  tableDisplayConfiguration: TableDisplayConfigurationSchema,
})

const VisualStyleOptionsSchema = z.object({
  visualEditorProperties: VisualEditorPropertiesSchema,
})

const PanelsSchema = z.object({
  [Panel.LEFT]: z.string(),
  [Panel.RIGHT]: z.string(),
  [Panel.BOTTOM]: z.string(),
})

const UiSchema = z.object({
  panels: PanelsSchema,
  activeNetworkView: IdTypeSchema,
  enablePopup: z.boolean(),
  showErrorDialog: z.boolean(),
  errorMessage: z.string(),
  tableUi: TableUIStateSchema,
  networkBrowserPanelUi: NetworkBrowserPanelStateSchema,
  visualStyleOptions: z.record(IdTypeSchema, VisualStyleOptionsSchema),
  networkViewUi: NetworkViewUiStateSchema,
  customNetworkTabName: z.record(z.string(), z.string()).optional(),
})

const UiStateStoredSchema = UiSchema.extend({
  id: z.string(),
})

const NetworkPropertySchema = z.object({
  subNetworkId: z.string().nullable(),
  value: ValueTypeSchema,
  predicateString: z.string(),
  dataType: z.string(),
})

const NetworkSummarySchema = z.object({
  isNdex: z.boolean(),
  ownerUUID: IdTypeSchema,
  isReadOnly: z.boolean(),
  subnetworkIds: z.array(z.number()),
  isValid: z.boolean(),
  warnings: z.array(z.string()),
  errorMessage: z.string().optional(),
  isShowcase: z.boolean(),
  isCertified: z.boolean(),
  indexLevel: z.string(),
  hasLayout: z.boolean(),
  hasSample: z.boolean(),
  cxFileSize: z.number(),
  cx2FileSize: z.number(),
  name: z.string(),
  properties: z.array(NetworkPropertySchema),
  owner: z.string(),
  version: z.string(),
  completed: z.boolean(),
  visibility: z.string(),
  nodeCount: z.number(),
  edgeCount: z.number(),
  description: z.string(),
  creationTime: DateSchema,
  externalId: z.string(),
  isDeleted: z.boolean(),
  modificationTime: DateSchema,
})

const WorkspaceSchema = z.object({
  name: z.string(),
  id: IdTypeSchema,
  currentNetworkId: IdTypeSchema,
  networkIds: z.array(IdTypeSchema),
  localModificationTime: DateSchema,
  creationTime: DateSchema,
  networkModified: z.record(z.union([z.boolean(), z.undefined()])),
  isRemote: z.boolean().optional(),
  options: z.unknown().optional(),
})

const TimestampSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
})

const DiscreteFilterDetailsSchema = z.object({
  predicate: z.string(),
  criterion: z.string(),
  description: z.string(),
  tooltip: z.string(),
})

const NumberRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
})

const DiscreteRangeSchema = z.object({
  values: z.array(ValueTypeSchema),
})

const FilterConfigSchema = z.object({
  name: z.string(),
  target: z.string(),
  attributeName: z.string(),
  label: z.string(),
  description: z.string(),
  selectionType: z.string().optional(),
  widgetType: z.string(),
  displayMode: z.string(),
  visualMapping: VisualMappingFunctionSchema.optional(),
  range: NumberRangeSchema.or(DiscreteRangeSchema),
  discreteFilterDetails: z.array(DiscreteFilterDetailsSchema).optional(),
})

const FilterConfigWithRecordsSchema = FilterConfigSchema.extend({
  visualMapping: z
    .union([
      DiscreteMappingFunctionSchema.extend({
        vpValueMap: MapEntriesSchema,
      }),
      VisualMappingFunctionSchema,
    ])
    .optional(),
})

const ComponentMetadataSchema = z.object({
  id: z.string(),
  type: z.string(),
})

const CyAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  components: z.array(ComponentMetadataSchema),
  status: z.string().optional(),
})

const ServiceAppActionSchema = z.string()

const MenuPathElementSchema = z.object({
  name: z.string(),
  gravity: z.number(),
})

const CyWebMenuItemSchema = z.object({
  root: z.string(),
  path: z.array(MenuPathElementSchema),
})

const ServiceAppParameterSchema = z.object({
  displayName: z.string(),
  description: z.string(),
  type: z.string(),
  valueList: z.array(z.string()).optional(),
  defaultValue: z.string(),
  value: z.string().optional(),
  validationType: z.string(),
  columnTypeFilter: z.string(),
  validationHelp: z.string(),
  validationRegex: z.string(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
})

const InputColumnSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  dataType: z.string(),
  allowMultipleSelection: z.boolean(),
  defaultColumnName: z.string(),
  columnName: z.string(),
})

const InputNetworkSchema = z.object({
  model: z.string(),
  format: z.string(),
})

const ServiceInputDefinitionSchema = z.object({
  type: z.string(),
  scope: z.string(),
  inputColumns: z.array(InputColumnSchema),
  inputNetwork: InputNetworkSchema,
})

const ServiceAppSchema = z.object({
  url: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  serviceInputDefinition: ServiceInputDefinitionSchema.optional(),
  cyWebAction: z.array(ServiceAppActionSchema),
  cyWebMenuItem: CyWebMenuItemSchema,
  author: z.string(),
  citation: z.string(),
  parameters: z.array(ServiceAppParameterSchema),
})

const OpaqueAspectsDbSchema = z.object({
  id: IdTypeSchema,
  aspects: z.record(z.string(), z.array(z.unknown())),
})

const OpaqueAspectsSchema = z.record(z.array(z.unknown()))

const EditSchema = z.object({
  undoCommand: z.string(),
  description: z.string(),
  undoParams: z.array(z.unknown()),
  redoParams: z.array(z.unknown()),
})

const UndoRedoStackSchema = z.object({
  undoStack: z.array(EditSchema),
  redoStack: z.array(EditSchema),
})

const UndoRedoStackDbSchema = z.object({
  id: IdTypeSchema,
  undoRedoStack: UndoRedoStackSchema,
})

const ViewValuesSchema = z.instanceof(Map).or(MapEntriesSchema)

const ViewSchema = z.object({
  id: IdTypeSchema,
  values: ViewValuesSchema,
})

const NodeViewSchema = ViewSchema.extend({
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
})

const EdgeViewSchema = ViewSchema

const NetworkViewSchema = z.object({
  id: IdTypeSchema,
  nodeViews: z.record(NodeViewSchema),
  edgeViews: z.record(EdgeViewSchema),
  selectedNodes: z.array(IdTypeSchema),
  selectedEdges: z.array(IdTypeSchema),
  type: z.string().optional(),
  viewId: IdTypeSchema.optional(),
  values: ViewValuesSchema,
})

const NodeViewWithRecordsSchema = z.object({
  id: IdTypeSchema,
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
  values: MapEntriesSchema,
})

const EdgeViewWithRecordsSchema = z.object({
  id: IdTypeSchema,
  values: MapEntriesSchema,
})

const NetworkViewWithRecordsSchema = z.object({
  id: IdTypeSchema,
  nodeViews: z.record(NodeViewWithRecordsSchema),
  edgeViews: z.record(EdgeViewWithRecordsSchema),
  selectedNodes: z.array(IdTypeSchema),
  selectedEdges: z.array(IdTypeSchema),
  type: z.string().optional(),
  viewId: IdTypeSchema.optional(),
  values: MapEntriesSchema,
})

export const validateWorkspace = (value: unknown): Workspace =>
  WorkspaceSchema.parse(value) as Workspace

export const validateNetwork = (value: unknown): Network =>
  NetworkSchema.parse(value) as Network

export const validateTable = (value: unknown): Table =>
  TableSchema.parse(value) as Table

export const validateSerializedTable = (value: unknown): TableWithRecords =>
  TableWithRecordsSchema.parse(value) as TableWithRecords

export const validateVisualStyle = (
  value: unknown,
): VisualStyle | VisualStyleWithRecords =>
  VisualStyleSchema.parse(value) as VisualStyle | VisualStyleWithRecords

export const validateNetworkView = (value: unknown): NetworkView =>
  NetworkViewSchema.parse(value) as NetworkView

export const validateSerializedNetworkView = (
  value: unknown,
): NetworkViewWithRecords =>
  NetworkViewWithRecordsSchema.parse(value) as NetworkViewWithRecords

export const validateUiState = (value: unknown): Ui =>
  UiSchema.parse(value) as Ui

export const validateStoredUiState = (value: unknown) =>
  UiStateStoredSchema.parse(value) as Ui & { id: string }

export const validateTimestampEntry = (value: unknown) =>
  TimestampSchema.parse(value) as { id: string; timestamp: number }

export const validateFilterConfig = (value: unknown): FilterConfig =>
  FilterConfigSchema.parse(value) as FilterConfig

export const validateSerializedFilterConfig = (
  value: unknown,
): FilterConfigWithRecords =>
  FilterConfigWithRecordsSchema.parse(value) as FilterConfigWithRecords

export const validateCyApp = (value: unknown): CyApp =>
  CyAppSchema.parse(value) as CyApp

export const validateServiceApp = (value: unknown): ServiceApp =>
  ServiceAppSchema.parse(value) as ServiceApp

export const validateOpaqueAspectsDb = (value: unknown): OpaqueAspectsDB =>
  OpaqueAspectsDbSchema.parse(value) as OpaqueAspectsDB

export const validateOpaqueAspects = (value: unknown): OpaqueAspects =>
  OpaqueAspectsSchema.parse(value) as OpaqueAspects

export const validateUndoRedoStackDb = (value: unknown): UndoRedoStackDB =>
  UndoRedoStackDbSchema.parse(value) as UndoRedoStackDB

export const validateUndoRedoStack = (value: unknown): UndoRedoStack =>
  UndoRedoStackSchema.parse(value) as UndoRedoStack

export const validateNetworkSummary = (value: unknown): NetworkSummary =>
  NetworkSummarySchema.parse(value) as NetworkSummary

export const validateWorkspaceArray = (value: unknown): Workspace[] =>
  z.array(WorkspaceSchema).parse(value) as Workspace[]

export const validateServiceAppArray = (value: unknown): ServiceApp[] =>
  z.array(ServiceAppSchema).parse(value) as ServiceApp[]

export const validateNetworkList = (value: unknown): Network[] =>
  z.array(NetworkSchema).parse(value) as Network[]
