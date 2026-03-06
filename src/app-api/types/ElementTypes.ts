// src/app-api/types/ElementTypes.ts

// Re-export commonly used types from the core models to
// simplify imports in app API hooks and external apps.

// ── Identity ────────────────────────────────────────────────────
export type { IdType } from '../../models/IdType'

// ── Table model types ───────────────────────────────────────────
export type { AttributeName } from '../../models/TableModel/AttributeName'
export type { Column } from '../../models/TableModel/Column'
export type { Table } from '../../models/TableModel/Table'
export type { ValueType } from '../../models/TableModel/ValueType'
export { ValueTypeName } from '../../models/TableModel/ValueTypeName'

// ── Network model types ─────────────────────────────────────────
export type { CyNetwork } from '../../models/CyNetworkModel/CyNetwork'
export type { Edge } from '../../models/NetworkModel/Edge'
export type { Network } from '../../models/NetworkModel/Network'
export type { Node } from '../../models/NetworkModel/Node'
export type { NetworkSummary } from '../../models/NetworkSummaryModel/NetworkSummary'

// ── Visual style types ──────────────────────────────────────────
export { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
export type { VisualStyle } from '../../models/VisualStyleModel/VisualStyle'

// ── View model types ────────────────────────────────────────────
export type { NetworkView } from '../../models/ViewModel/NetworkView'

// ── CX2 types ───────────────────────────────────────────────────
export type { Cx2 } from '../../models/CxModel/Cx2'

// ── App registration types ───────────────────────────────────────
export type { ComponentMetadata } from '../../models/AppModel/ComponentMetadata'
export { ComponentType } from '../../models/AppModel/ComponentType'
