// src/app-api/types/index.ts

// ── App API result types ─────────────────────────────────────────
export type { ApiError,ApiFailure, ApiResult, ApiSuccess } from './ApiResult'
export { ApiErrorCode, fail, isFail,isOk, ok } from './ApiResult'

// ── App lifecycle types ─────────────────────────────────────────
export type { AppContext, CyAppWithLifecycle } from './AppContext'

// ── Domain API types (Phase 1a–1g) ──────────────────────────────
export type { ElementApi, NodeData, EdgeData, CreateNodeOptions, CreateEdgeOptions } from '../core/elementApi'
export type { NetworkApi, CreateNetworkFromEdgeListProps, CreateNetworkFromCx2Props, DeleteNetworkOptions } from '../core/networkApi'
export type { SelectionApi, SelectionState } from '../core/selectionApi'
export type { ViewportApi, PositionRecord } from '../core/viewportApi'
export type { TableApi, AppTableType, CellEdit } from '../core/tableApi'
export type { VisualStyleApi } from '../core/visualStyleApi'
export type { LayoutApi, LayoutAlgorithmInfo, ApplyLayoutOptions } from '../core/layoutApi'
// Note: Cx2 from exportApi is a loose alias (any[]); the canonical Cx2 is exported below via ElementTypes
export type { ExportApi, ExportOptions } from '../core/exportApi'

// ── Workspace API types (Phase 1f) ───────────────────────────────
export type { WorkspaceApi, WorkspaceInfo, WorkspaceNetworkInfo } from '../core/workspaceApi'

// ── CyWebApiType: assembles all 9 domain APIs (Phase 1g) ─────────
export type { CyWebApiType } from '../core'

// ── Re-exported model types ─────────────────────────────────────
export type {
  AttributeName,
  Column,
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
export { ValueTypeName, VisualPropertyName } from './ElementTypes'
