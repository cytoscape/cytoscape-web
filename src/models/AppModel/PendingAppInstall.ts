import type { AppCatalogEntry } from './AppCatalogEntry'
import type { AppType } from './AppType'
import type { ServiceMetadata } from './ServiceMetadata'

/**
 * An app the URL asked to install, fetched and classified but not yet installed.
 *
 * `?installApp=` carries an arbitrary URL, so the boot resolves what is actually
 * behind it — a React app manifest or service-app metadata — and hands the
 * result to AppShell, which names each item in a confirmation dialog. Nothing is
 * installed until the user confirms.
 *
 * The metadata is carried for display only. Registration refetches through
 * `addService`, which owns the ServiceApp shape and its persistence.
 */
export type PendingAppInstall =
  | {
      type: typeof AppType.Client
      /** The manifest URL the link supplied. */
      url: string
      entry: AppCatalogEntry
    }
  | {
      type: typeof AppType.Service
      /** The service endpoint, normalized by `normalizeServiceAppUrl`. */
      url: string
      metadata: ServiceMetadata
    }

/** Human-readable label for a pending install, for dialogs and messages. */
export const pendingInstallName = (pending: PendingAppInstall): string =>
  pending.type === 'client'
    ? (pending.entry.name ?? pending.entry.id)
    : pending.metadata.name
