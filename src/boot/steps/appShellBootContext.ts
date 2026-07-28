import type { AppCatalogEntry } from '@/models/AppModel'
import type { IdType } from '@/models/IdType'
import type { NetworkSummary } from '@/models/NetworkSummaryModel'
import type { Workspace } from '@/models/WorkspaceModel'

// Everything the AppShell boot steps need from React, gathered once at mount.
//
// The steps themselves are plain async functions: they read and write stores
// through `useXxxStore.getState()` (the cross-store pattern AGENTS.md
// prescribes), so nothing below is a hook and every step is unit-testable
// without rendering anything. Only the values React genuinely owns — the
// mount-time URL snapshot, the navigate function, and the two hook-provided
// callbacks — are passed in.

export interface AppShellBootContext {
  /**
   * URL search params as they were at mount. Snapshotted deliberately: the
   * boot both reads these and, at the end, strips them (URL-as-state, see
   * ROUTING_SPECIFICATION.md). Re-reading mid-boot would see its own cleanup.
   */
  search: URLSearchParams
  /** `:networkId` from the route, if the app was deep-linked to a network. */
  networkIdParam?: string
  /** Mount-time pathname, used only in error messages. */
  pathname: string
  navigate: (
    to: { pathname: string; search: string },
    options: { replace: boolean },
  ) => void
  loadNetworkSummaries: (
    networkIds: IdType[],
  ) => Promise<Record<IdType, NetworkSummary>>
  installApp: (
    entry: AppCatalogEntry,
    options?: { activate?: boolean },
  ) => Promise<void>
}

/**
 * Threaded through the steps that build up the workspace before it is
 * published. Mutable on purpose — deep-link and import resolution both add to
 * the same workspace and summary set, exactly as the original inline code did.
 */
export interface WorkspaceDraft {
  workspace: Workspace
  summaries: Record<IdType, NetworkSummary>
  /** Import/deep-link failures, surfaced as one message at publish time. */
  errors: string[]
  /**
   * True when a `:networkId` in the URL could not be resolved. The requested id
   * is then kept as the current network so the error message explains an
   * address the user recognizes (CW-514) — see `resolveInitialNetworkId`.
   */
  deepLinkFailed: boolean
}

export const hasSearchParams = (search: URLSearchParams): boolean =>
  // Not `search.size`: that property is Chrome 113+ / Safari 17+, and on an
  // older engine `undefined > 0` is false, silently skipping ALL URL state
  // restoration while the rest of the boot carried on.
  [...search.keys()].length > 0
