import { fetchNdexSummaries } from '@/data/external-api/ndex'
import { useCredentialStore } from '@/data/hooks/stores/CredentialStore'
import { logStartup } from '@/debug'
import type { AppShellBootContext, WorkspaceDraft } from './appShellBootContext'

/**
 * How long boot waits for the NDEx summary before giving up on the deep link.
 *
 * `fetchNdexSummaries` goes through the ndex-client, which has no timeout of its
 * own and takes no AbortSignal, so a hung or very slow NDEx left this await
 * pending forever — and boot with it, on a blank screen.
 */
const DEEP_LINK_TIMEOUT_MS = 30000

/**
 * Reject after `ms` if `promise` has not settled.
 *
 * Bounds the WAIT, not the request: the underlying fetch keeps running because
 * the client exposes no way to cancel it. The rejection lands in the catch
 * below, which records the failure and lets boot continue.
 */
const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

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
    summary = (
      await withTimeout(
        fetchNdexSummaries(networkIdParam, token),
        DEEP_LINK_TIMEOUT_MS,
        `NDEx did not respond within ${DEEP_LINK_TIMEOUT_MS / 1000}s`,
      )
    )?.[0]
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
