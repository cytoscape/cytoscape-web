// src/app-api/types/index.ts

// ── App API result types ─────────────────────────────────────────
export type { ApiError,ApiFailure, ApiResult, ApiSuccess } from './ApiResult'
export { ApiErrorCode, fail, isFail,isOk, ok } from './ApiResult'

// ── App lifecycle types ─────────────────────────────────────────
export type { AppContext, CyAppWithLifecycle } from './AppContext'

// ── Workspace API types (Phase 1f) ───────────────────────────────
export type { WorkspaceApi, WorkspaceInfo, WorkspaceNetworkInfo } from '../core/workspaceApi'

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
