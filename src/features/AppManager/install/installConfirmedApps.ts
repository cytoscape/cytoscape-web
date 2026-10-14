import type { AppCatalogEntry } from '@/models/AppModel/AppCatalogEntry'
import { AppType } from '@/models/AppModel/AppType'
import type { PendingAppInstall } from '@/models/AppModel/PendingAppInstall'
import { pendingInstallName } from '@/models/AppModel/PendingAppInstall'
import type { Message } from '@/models/MessageModel'
import { MessageSeverity } from '@/models/MessageModel'

export interface InstallConfirmedAppsDeps {
  installApp: (
    entry: AppCatalogEntry,
    options?: { activate?: boolean },
  ) => Promise<void>
  addService: (url: string) => Promise<void>
  addMessage: (message: Message) => void
  warn: (message: string, error: unknown) => void
}

/**
 * Installs the apps the user confirmed in the install dialog.
 *
 * Extracted from AppShell so the dispatch, ordering and error isolation are
 * testable without rendering the whole shell.
 *
 * Sequential and individually caught on purpose: one link may carry several
 * apps, and a single bad endpoint must not abandon the ones after it.
 */
export const installConfirmedApps = async (
  confirmed: readonly PendingAppInstall[],
  deps: InstallConfirmedAppsDeps,
): Promise<void> => {
  for (const pending of confirmed) {
    const name = pendingInstallName(pending)
    try {
      if (pending.type === AppType.Client) {
        // An install intent implies activation (§7.3). The §9 gate inside
        // installApp still applies and surfaces its own messages.
        await deps.installApp(pending.entry, { activate: true })
      } else {
        // Refetches the endpoint the boot already read. Deliberate: addService
        // owns the ServiceApp shape and its persistence, and the boot's copy
        // exists only to name the app in the dialog.
        await deps.addService(pending.url)
      }
      deps.addMessage({
        message: `Added ${name}`,
        duration: 4000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (error) {
      deps.addMessage({
        message: `Failed to add ${name} from ${pending.url}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
      deps.warn(`installApp intent failed for ${pending.url}`, error)
    }
  }
}
