import { putNetworkSummaryToDb } from '@/data/db'
import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useTableStore } from '@/data/hooks/stores/TableStore'
import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '@/data/hooks/stores/VisualStyleStore'
import { fetchUrlCx } from '@/models/CxModel/fetchUrlCxUtil'
import type { AppShellBootContext, WorkspaceDraft } from './appShellBootContext'

const IMPORT_QUERY_KEY = 'import'

/** 10MB cap for URL imports (below the general maxNetworkFileSize). */
const MAX_NETWORK_FILE_SIZE = 10000000

/**
 * Imports CX2 networks named by `?import=<url>` (repeatable).
 *
 * Each URL is isolated: one bad link records an error and the rest still
 * import. The last successful import becomes the current network.
 *
 * Note this runs AFTER resolveDeepLink, so when a URL carries both a
 * `:networkId` path and `?import=`, the import wins the current-network slot.
 * That is long-standing behavior and deep links in the wild depend on it; see
 * ROUTING_SPECIFICATION.md, which documents the intent as the other order.
 */
export const runUrlImports = async (
  ctx: AppShellBootContext,
  draft: WorkspaceDraft,
): Promise<void> => {
  const { workspace, summaries } = draft
  const importUrls = ctx.search.getAll(IMPORT_QUERY_KEY)

  for (const importUrl of importUrls) {
    try {
      const { cyNetwork, summary } = await fetchUrlCx(
        importUrl,
        MAX_NETWORK_FILE_SIZE,
      )
      const {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews,
        visualStyleOptions,
      } = cyNetwork
      const importedNetworkId = network.id

      summaries[importedNetworkId] = summary
      await putNetworkSummaryToDb(summary)
      workspace.currentNetworkId = importedNetworkId
      workspace.networkIds.push(importedNetworkId)

      // Store operations assume the imported network is the current one, so
      // currentNetworkId is set above before any of these run.
      useUiStateStore
        .getState()
        .setVisualStyleOptions(importedNetworkId, visualStyleOptions)
      useNetworkStore.getState().add(network)
      useVisualStyleStore.getState().add(importedNetworkId, visualStyle)
      useTableStore.getState().add(importedNetworkId, nodeTable, edgeTable)
      useViewModelStore.getState().add(importedNetworkId, networkViews[0])
    } catch (error) {
      draft.errors.push(
        `Unable to import network from query params at url ${importUrl}.`,
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
}
