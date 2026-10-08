import { useAppStore } from '@/data/hooks/stores/AppStore'
import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { logStartup } from '@/debug'
import { AppType } from '@/models/AppModel/AppType'
import type { PendingAppInstall } from '@/models/AppModel/PendingAppInstall'
import { pendingInstallName } from '@/models/AppModel/PendingAppInstall'
import { normalizeServiceAppUrl } from '@/models/AppModel/impl'
import { MessageSeverity } from '@/models/MessageModel'
import { classifyInstallPayload } from '@/features/AppManager/install/classifyInstallPayload'
import { isAllowedOrigin } from '@/features/AppManager/install/installGate'
import type { AppShellBootContext } from './appShellBootContext'

/**
 * One or more app URLs to install. Each is fetched and its payload decides
 * whether it is a React app manifest or service-app metadata
 * (workspace-app-install-design §7.2). Repeatable.
 */
const INSTALL_APP_QUERY_KEY = 'installApp'

/**
 * The install host comes from a URL parameter, so it is arbitrary and may be
 * unreachable rather than merely slow. runPhase catches errors but cannot
 * impose a deadline, so without this an unresponsive host stalls the INTENTS
 * phase indefinitely — holding the boot shell open and, worse, never reaching
 * the ROUTE phase that strips the query params, so a reload retries the same
 * dead host forever.
 */
const INSTALL_FETCH_TIMEOUT_MS = 10000

const reportFailure = (url: string, reason: string, error?: unknown): void => {
  useMessageStore.getState().addMessage({
    message: `Failed to install app from ${url}: ${reason}`,
    duration: 5000,
    severity: MessageSeverity.ERROR,
  })
  logStartup.warn(`[boot]: install intent failed for ${url}: ${reason}`, error)
}

/**
 * Fetch one install URL and resolve what it points at. Returns undefined and
 * reports the reason when the URL cannot be turned into an installable app.
 */
const resolveInstallUrl = async (
  url: string,
  appInstallAllowedOrigins: string[],
  allowsLocalhostAppsOn?: string,
): Promise<PendingAppInstall | undefined> => {
  let payload: unknown
  try {
    // The value is whatever the link put in the query string, so check it is an
    // absolute http(s) URL before requesting it. A relative value would
    // otherwise resolve against Cytoscape Web's own origin and fetch something
    // the link never named.
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`unsupported URL scheme "${parsed.protocol}"`)
    }
    const response = await fetch(parsed.href, {
      signal: AbortSignal.timeout(INSTALL_FETCH_TIMEOUT_MS),
      // No ambient session credentials: the URL is untrusted, and app metadata
      // is public by definition.
      credentials: 'omit',
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    payload = await response.json()
  } catch (error) {
    reportFailure(
      url,
      error instanceof Error ? error.message : 'unknown error',
      error,
    )
    return undefined
  }

  const classified = classifyInstallPayload(payload)
  if (classified === undefined) {
    reportFailure(
      url,
      'the response is neither an app manifest nor service metadata',
    )
    return undefined
  }

  if (classified.type === AppType.Service) {
    return {
      type: AppType.Service,
      url: normalizeServiceAppUrl(url),
      metadata: classified.metadata,
    }
  }

  // A React app's bundle is loaded as code into this origin, so the allow-list
  // (§9) stays a hard gate — the confirmation dialog is an addition to it, not a
  // replacement. Checked here rather than only inside installApp so a rejected
  // app never reaches the dialog and the user is not asked about an install that
  // cannot happen. Service apps have no allow-list: the dialog is their gate.
  if (
    !isAllowedOrigin(
      classified.entry.url,
      appInstallAllowedOrigins,
      allowsLocalhostAppsOn,
    )
  ) {
    reportFailure(url, 'its URL is not from an allowed origin')
    return undefined
  }

  return { type: AppType.Client, url, entry: classified.entry }
}

/**
 * Processes app-install intents carried by the URL.
 *
 * Runs after publishWorkspace, because the install that follows writes to the
 * workspace, which is only accepted once hydrated (§8.3).
 *
 * Nothing is installed here. Every URL comes from an arbitrary link, so the apps
 * are resolved and returned for AppShell to name in a confirmation dialog.
 * Failures are isolated per URL: one dead host does not lose the others.
 */
export const runInstallIntents = async (
  ctx: AppShellBootContext,
): Promise<{ pendingAppInstalls: PendingAppInstall[] }> => {
  const requested = ctx.search.getAll(INSTALL_APP_QUERY_KEY)
  if (requested.length === 0) {
    return { pendingAppInstalls: [] }
  }

  const resolved = await Promise.all(
    requested.map(async (url) =>
      url.trim() === ''
        ? undefined
        : resolveInstallUrl(
            url.trim(),
            ctx.appInstallAllowedOrigins,
            ctx.allowsLocalhostAppsOn,
          ),
    ),
  )

  const { serviceApps } = useAppStore.getState()
  const seen = new Set<string>()
  const pendingAppInstalls: PendingAppInstall[] = []
  const alreadyInstalled: string[] = []

  for (const pending of resolved) {
    if (pending === undefined) {
      continue
    }
    // Keyed on what the payload resolved to, not the URL that served it: two
    // manifest URLs can describe the same app id, and listing it twice would
    // both read as a duplicate in the dialog and install it twice.
    const identity =
      pending.type === AppType.Client
        ? `${AppType.Client}:${pending.entry.id}`
        : `${AppType.Service}:${pending.url}`
    if (seen.has(identity)) {
      continue
    }
    seen.add(identity)
    // An already-registered service app is not installed again: re-registering
    // overwrites the stored ServiceApp and discards the parameter values the
    // user set on it. React apps are never dropped — installApp is an upsert, so
    // a repeated intent is how a version update arrives.
    if (
      pending.type === AppType.Service &&
      serviceApps[pending.url] !== undefined
    ) {
      alreadyInstalled.push(pendingInstallName(pending))
      continue
    }
    pendingAppInstalls.push(pending)
  }

  // Say so rather than doing nothing. Skipping in silence makes an App Store
  // link look broken: no dialog opens, no message appears, and the user has no
  // way to tell a working link from a dead one.
  if (alreadyInstalled.length > 0) {
    useMessageStore.getState().addMessage({
      message: `Already installed: ${alreadyInstalled.join(', ')}`,
      duration: 4000,
      severity: MessageSeverity.INFO,
    })
  }

  return { pendingAppInstalls }
}
