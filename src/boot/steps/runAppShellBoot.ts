import { logStartup } from '@/debug'
import {
  getTabNetworkId,
  resolveInitialNetworkId,
} from '@/data/tabState/tabNetwork'
import type { PendingAppInstall } from '@/models/AppModel/PendingAppInstall'
import { createWorkspace } from '@/models/WorkspaceModel/impl/workspaceImpl'
import { BootPhase } from '../bootPhases'
import { runPhase } from '../runBoot'
import {
  hasSearchParams,
  type AppShellBootContext,
  type WorkspaceDraft,
} from './appShellBootContext'
import { prefetchCyNetworkFromDb } from '@/data/prefetch/networkPrefetch'
import { loadWorkspaceState } from './loadWorkspaceState'
import { publishWorkspace } from './publishWorkspace'
import { resolveDeepLink } from './resolveDeepLink'
import { restoreUrlState } from './restoreUrlState'
import { runInstallIntents } from './runInstallIntents'
import { runUrlImports } from './runUrlImports'

// The AppShell half of the boot: hydrate stores from IndexedDB and the URL,
// then hand the app to the router.
//
// Every step goes through runPhase, which means a failure anywhere is logged,
// timed and contained rather than aborting the rest. That matters most for
// publishWorkspace and finalizeRoute: they are what make the app usable and
// what cleans the URL, and they used to be skipped entirely if anything before
// them threw — leaving the shell up forever with the failing params still in
// the address bar, so a reload reproduced the same failure.

export interface AppShellBootResult {
  /** Apps the URL asked to install, resolved but awaiting user confirmation. */
  pendingAppInstalls: PendingAppInstall[]
}

const emptyWorkspaceDraft = (): WorkspaceDraft => ({
  workspace: createWorkspace(),
  summaries: {},
  errors: [],
  deepLinkFailed: false,
})

export const runAppShellBoot = async (
  ctx: AppShellBootContext,
): Promise<AppShellBootResult> => {
  logStartup.info('[boot]: initializing app shell')

  const loaded = await runPhase(BootPhase.WORKSPACE, () =>
    loadWorkspaceState(ctx),
  )

  // A failed workspace read is survivable: publish an empty one so the app
  // still reaches a usable state instead of hanging on the boot shell.
  const draft = loaded.ok ? loaded.value : emptyWorkspaceDraft()
  if (!loaded.ok) {
    draft.errors.push(
      'Your saved workspace could not be loaded. Starting with an empty workspace.',
    )
  }

  await runPhase(BootPhase.DEEP_LINK, () => resolveDeepLink(ctx, draft))
  await runPhase(BootPhase.IMPORTS, () => runUrlImports(ctx, draft))
  await runPhase(BootPhase.PUBLISH, () => {
    // Which network THIS tab should display. The URL is the per-tab source of
    // truth (each browser tab has its own address bar, and it survives reload);
    // a per-tab sessionStorage backstop comes next, then the shared
    // currentNetworkId. Without this a tab re-derives its network from the
    // shared workspace row and swaps to whatever another tab last opened
    // (CW-722).
    draft.workspace.currentNetworkId = resolveInitialNetworkId(
      ctx.networkIdParam,
      getTabNetworkId(),
      draft.workspace.currentNetworkId,
      draft.workspace.networkIds,
      draft.deepLinkFailed,
    )

    publishWorkspace(draft)

    // Fire-and-forget: overlaps the current network's IndexedDB read with the
    // editor chunk download/mount; the editor's load path consumes it via
    // takePrefetchedCyNetwork and falls back to a normal read on a miss.
    prefetchCyNetworkFromDb(draft.workspace.currentNetworkId)
  })

  const intents = await runPhase(BootPhase.INTENTS, () =>
    runInstallIntents(ctx),
  )

  await runPhase(BootPhase.ROUTE, () => {
    if (hasSearchParams(ctx.search)) {
      restoreUrlState(ctx, draft.workspace.currentNetworkId)
    }

    // Strips every search param — they have all been consumed by now.
    ctx.navigate(
      {
        pathname: `/${draft.workspace.id}/networks/${draft.workspace.currentNetworkId}`,
        search: '',
      },
      { replace: true },
    )
  })

  return {
    pendingAppInstalls: intents.ok ? intents.value.pendingAppInstalls : [],
  }
}
