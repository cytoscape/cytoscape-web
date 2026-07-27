import { useAppStore } from '@/data/hooks/stores/AppStore'
import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { logStartup } from '@/debug'
import { serviceAppUrlsToAdd } from '@/models/AppModel/impl'
import { MessageSeverity } from '@/models/MessageModel'
import { parseSingleEntryManifest } from '@/features/AppManager/install/installGate'
import type { AppShellBootContext } from './appShellBootContext'

/** A URL pointing to a single-entry manifest (workspace-app-install-design §7.2). */
const INSTALL_APP_QUERY_KEY = 'installApp'

/** One or more external service endpoints to register (CW-521). */
const ADD_SERVICE_APP_QUERY_KEY = 'addserviceapp'

/**
 * The manifest host comes from a URL parameter, so it is arbitrary and may be
 * unreachable rather than merely slow. runPhase catches errors but cannot
 * impose a deadline, so without this an unresponsive host stalls the INTENTS
 * phase indefinitely — holding the boot shell open and, worse, never reaching
 * the ROUTE phase that strips the query params, so a reload retries the same
 * dead host forever.
 */
const MANIFEST_FETCH_TIMEOUT_MS = 10000

/**
 * Processes app-install intents carried by the URL.
 *
 * Runs after publishWorkspace, because installApp's persisted write is only
 * accepted once the workspace is hydrated (§8.3).
 *
 * Returns the service-app URLs that need confirmation. These are NOT installed
 * here: they come from an arbitrary link, so AppShell prompts first.
 */
export const runInstallIntents = async (
  ctx: AppShellBootContext,
): Promise<{ serviceAppUrlsNeedingConfirmation: string[] }> => {
  const installAppUrl = ctx.search.get(INSTALL_APP_QUERY_KEY)

  if (installAppUrl !== null) {
    try {
      const response = await fetch(installAppUrl, {
        signal: AbortSignal.timeout(MANIFEST_FETCH_TIMEOUT_MS),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const entry = parseSingleEntryManifest(await response.json())
      if (entry === undefined) {
        throw new Error('manifest contained no valid app entry')
      }
      // An install intent implies activation (§7.3). The §9 gate inside
      // installApp still applies (origin allow-list, host compatibility) and
      // surfaces its own messages, so only fetch/parse errors land here.
      await ctx.installApp(entry, { activate: true })
    } catch (error) {
      useMessageStore.getState().addMessage({
        message: `Failed to install app from ${installAppUrl}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
      logStartup.warn(
        `[boot]: install intent failed for ${installAppUrl}`,
        error,
      )
    }
  }

  const requested = ctx.search.getAll(ADD_SERVICE_APP_QUERY_KEY)

  return {
    serviceAppUrlsNeedingConfirmation:
      requested.length === 0
        ? []
        : serviceAppUrlsToAdd(requested, useAppStore.getState().serviceApps),
  }
}
