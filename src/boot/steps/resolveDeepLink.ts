import { fetchNdexSummaries } from '@/data/external-api/ndex'
import { useCredentialStore } from '@/data/hooks/stores/CredentialStore'
import { logStartup } from '@/debug'
import type { AppShellBootContext, WorkspaceDraft } from './appShellBootContext'

/**
 * Resolves a `:networkId` in the URL that the workspace does not already have,
 * by looking the network up in NDEx (`/:workspaceId/networks/:networkId`).
 *
 * Only the summary is fetched here; the CX2 itself is loaded lazily later by
 * WorkspaceEditor once the route resolves.
 *
 * This is the one boot path that genuinely waits on the SSO check — a
 * deep-linked network can be private, so it needs the gated token.
 */
export const resolveDeepLink = async (
  ctx: AppShellBootContext,
  draft: WorkspaceDraft,
): Promise<void> => {
  const { networkIdParam } = ctx
  const { workspace, summaries } = draft

  const isDeepLinked =
    networkIdParam !== undefined &&
    networkIdParam !== '' &&
    !workspace.networkIds.includes(networkIdParam)

  if (!isDeepLinked) {
    // Already in the workspace: use the cached copy. (Future: check whether
    // NDEx has a newer version and offer to update.)
    return
  }

  let summary
  try {
    const token = await useCredentialStore.getState().getToken()
    summary = (await fetchNdexSummaries(networkIdParam, token))?.[0]
  } catch (error) {
    // Caught rather than left to the phase runner: a thrown error (network
    // hiccup, CORS, private/deleted network, NDEx outage) must still tell the
    // user which address failed, instead of silently stranding them on an
    // unrelated local network (CW-514).
    draft.deepLinkFailed = true
    draft.errors.push(
      `Unable to import network ${networkIdParam} from ${ctx.pathname}. ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    )
    logStartup.warn(
      `[boot]: failed to fetch NDEx summary for ${networkIdParam}`,
      error,
    )
    return
  }

  if (summary === undefined) {
    draft.deepLinkFailed = true
    draft.errors.push(
      `Unable to import network ${networkIdParam} from ${ctx.pathname}. ${networkIdParam} does not exist in NDEx`,
    )
    return
  }

  summaries[networkIdParam] = summary
  workspace.currentNetworkId = networkIdParam
  workspace.networkIds.push(networkIdParam)
}
