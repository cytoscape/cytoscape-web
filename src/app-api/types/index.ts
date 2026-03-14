// src/app-api/types/index.ts

// ── App API result types ─────────────────────────────────────────
export type { ApiError, ApiFailure, ApiResult, ApiSuccess } from './ApiResult'
export { ApiErrorCode, fail, isFail, isOk, ok } from './ApiResult'

// ── App lifecycle types ─────────────────────────────────────────
export type { AppContext, AppContextApis, CyAppWithLifecycle } from './AppContext'

// ── Domain API types (Phase 1a–1g) ──────────────────────────────
export type {
  CreateEdgeOptions,
  CreateNodeOptions,
  EdgeData,
  ElementApi,
  NodeData,
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
export type { AppTableType, CellEdit, TableApi } from '../core/tableApi'
export type { PositionRecord, ViewportApi } from '../core/viewportApi'
export type { VisualStyleApi } from '../core/visualStyleApi'
// Note: Cx2 from exportApi is a loose alias (any[]); the canonical Cx2 is exported below via ElementTypes
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

// ── App Resource registration types (Phase 2) ───────────────────
export type {
  MenuItemHostProps,
  PanelHostProps,
  RegisteredResourceInfo,
  RegisterMenuItemOptions,
  RegisterPanelOptions,
  RegisterResourceEntry,
  ResourceApi,
  ResourceDeclaration,
  ResourceVisibilityResult,
} from './AppResourceTypes'
export type { ResourceSlot } from './AppResourceTypes'

// ── CyWebApiType: assembles all 10 domain APIs (Phase 1g+1h) ─────
export type { CyWebApiType } from '../core'

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
