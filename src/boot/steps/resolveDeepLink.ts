import { fetchNdexSummaries } from '@/data/external-api/ndex'
import { useCredentialStore } from '@/data/hooks/stores/CredentialStore'
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

  const token = await useCredentialStore.getState().getToken()
  const summary = (await fetchNdexSummaries(networkIdParam, token))?.[0]

  if (summary === undefined) {
    draft.errors.push(
      `Unable to import network ${networkIdParam} from ${ctx.pathname}. ${networkIdParam} does not exist in NDEx`,
    )
    return
  }

  summaries[networkIdParam] = summary
  workspace.currentNetworkId = networkIdParam
  workspace.networkIds.push(networkIdParam)
}
