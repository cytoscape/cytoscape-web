// src/app-api/types/index.ts

// ── App API result types ─────────────────────────────────────────
export type {
  ApiError,
  ApiErrorCodeDef,
  ApiErrorSeverity,
  ApiFailure,
  ApiResult,
  ApiSuccess,
} from './ApiResult'
export {
  AppCodes,
  ElementCodes,
  fail,
  isFail,
  isOk,
  ok,
  StyleCodes,
  TableCodes,
} from './ApiResult'

// ── App lifecycle types ─────────────────────────────────────────
export type {
  AppContext,
  AppContextApis,
  CyAppWithLifecycle,
} from './AppContext'

// ── Domain API types (Phase 1a–1g) ──────────────────────────────
export type {
  BatchCreateOptions,
  CreateEdgeOptions,
  CreateNodeOptions,
  EdgeData,
  EdgeSpec,
  ElementApi,
  NodeData,
  NodeSpec,
} from '../core/elementApi'
export type {
  ApplyLayoutOptions,
  LayoutAlgorithmInfo,
  LayoutApi,
} from '../core/layoutApi'
export type {
  CreateNetworkFromCx2Props,
  CreateNetworkFromEdgeListProps,
  DeleteNetworkOptions,
  NetworkApi,
} from '../core/networkApi'
export type { SelectionApi, SelectionState } from '../core/selectionApi'
export type {
  AppTableType,
  CellEdit,
  ColumnInfo,
  ExportTableToTsvOptions,
  GetTableOptions,
  ImportTableFromTsvOptions,
  TableApi,
} from '../core/tableApi'
export type { PositionRecord, ViewportApi } from '../core/viewportApi'
export type {
  CreateContinuousMappingOptions,
  VisualPropertyInfo,
  VisualStyleApi,
} from '../core/visualStyleApi'
// ExportApi's Cx2 is the canonical CxModel Cx2 (also exported via ElementTypes)
export type { ExportApi, ExportOptions } from '../core/exportApi'

// ── Workspace API types (Phase 1f) ───────────────────────────────
export type {
  WorkspaceApi,
  WorkspaceInfo,
  WorkspaceNetworkInfo,
} from '../core/workspaceApi'

// ── Context Menu API types (Phase 1h) ────────────────────────────
export type {
  ContextMenuApi,
  ContextMenuHandlerContext,
  ContextMenuItemConfig,
  ContextMenuTarget,
} from '../core/contextMenuApi'

// ── Node Graphics API types ──────────────────────────────────────
export type {
  NodeGraphicsApi,
  NodeGraphicsContainment,
  NodeGraphicsCrossOrigin,
  NodeGraphicsFit,
  NodeGraphicsImage,
  NodeGraphicsRenderHook,
  NodeGraphicsRequest,
  NodeGraphicsResult,
} from '../core/nodeGraphicsApi'

// ── App data storage types ───────────────────────────────────────
export type { AppDataApi, SetAppDataOptions } from './AppDataTypes'
export { MAX_APP_DATA_VALUE_BYTES } from './AppDataTypes'

// ── App Resource registration types (Phase 2) ───────────────────
export type {
  ModalHostProps,
  NetworkSearchOptionsHostProps,
  NetworkSearchQuery,
  PanelHostProps,
  RegisteredResourceInfo,
  RegisterMenuItemOptions,
  RegisterModalOptions,
  RegisterNetworkSearchProviderOptions,
  RegisterPanelOptions,
  RegisterResourceEntry,
  ResourceApi,
  ResourceDeclaration,
  ResourceVisibilityResult,
} from './AppResourceTypes'
export type { ResourceSlot } from './AppResourceTypes'

// ── Dialog API types (escape hatch for 'apps-menu' actions) ─────
export type {
  DialogApi,
  DialogRenderProps,
  OpenDialogOptions,
} from './AppDialogTypes'

// ── CyWebApiType: assembles all 10 domain APIs (Phase 1g+1h) ─────
export type { CyWebApiType } from '../core'

// ── Scoped (current-network) API ─────────────────────────────────
export type { ScopedCyWebApi } from '../core/scopedApi'

// ── Re-exported model types ─────────────────────────────────────
export type {
  AttributeName,
  Column,
  ComponentMetadata,
  Cx2,
  CyNetwork,
  Edge,
  IdType,
  Network,
  NetworkSummary,
  NetworkView,
  Node,
  Table,
  ValueType,
  VisualStyle,
} from './ElementTypes'
export {
  ComponentType,
  ValueTypeName,
  VisualPropertyName,
} from './ElementTypes'
