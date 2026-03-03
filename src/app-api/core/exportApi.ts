// src/app-api/core/exportApi.ts
// Framework-agnostic Export API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { IdType } from '../../models/IdType'
import { exportCyNetworkToCx2 } from '../../models/CxModel/impl/exporter'
import { CyNetwork } from '../../models/CyNetworkModel/CyNetwork'
import { ApiErrorCode, ApiResult, fail, ok } from '../types/ApiResult'

// ── Public types ─────────────────────────────────────────────────────────────

/** CX2 format — an array of aspect objects */
export type Cx2 = any[]

export interface ExportOptions {
  /** Optional override for the network name in the exported CX2 */
  networkName?: string
}

export interface ExportApi {
  exportToCx2(networkId: IdType, options?: ExportOptions): ApiResult<Cx2>
}

// ── Core implementation ──────────────────────────────────────────────────────

export const exportApi: ExportApi = {
  exportToCx2(networkId, options = {}): ApiResult<Cx2> {
    try {
      // 1. NetworkStore
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }

      // 2. TableStore
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Tables not found for network ${networkId}`,
        )
      }

      // 3. VisualStyleStore
      const visualStyle = useVisualStyleStore.getState().visualStyles[networkId]
      if (visualStyle === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Visual style not found for network ${networkId}`,
        )
      }

      // 4. ViewModelStore
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `View model not found for network ${networkId}`,
        )
      }

      // 5. OpaqueAspectStore (optional)
      const opaqueAspect =
        useOpaqueAspectStore.getState().opaqueAspects[networkId]

      // 6. NetworkSummaryStore (passed separately to exporter)
      const summary = useNetworkSummaryStore.getState().summaries[networkId]

      // Assemble CyNetwork
      const cyNetwork: CyNetwork = {
        network,
        nodeTable: tableRecord.nodeTable,
        edgeTable: tableRecord.edgeTable,
        visualStyle,
        networkViews: [viewModel],
        otherAspects: opaqueAspect !== undefined ? [opaqueAspect] : undefined,
        undoRedoStack: { undoStack: [], redoStack: [] },
      }

      const cx2 = exportCyNetworkToCx2(
        cyNetwork,
        summary,
        options.networkName,
      )
      return ok(cx2)
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },
}
