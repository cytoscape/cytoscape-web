import { useOnlineStatus } from '@/data/hooks/useOnlineStatus'

export const NDEX_OFFLINE_HINT =
  'No connection — NDEx is unavailable. Local editing and autosave keep working.'

/**
 * Fold connectivity into a control's own enabled state and tooltip (#697).
 *
 * Only operations that talk to NDEx take this. Cytoscape Web keeps the
 * workspace in this browser, so editing, layout, styling and autosave are
 * unaffected by connectivity and must never be gated on it — an app that
 * greys itself out when the network drops is claiming a dependency it does
 * not have.
 *
 * Offline wins over any other reason the control is unavailable: it is the one
 * the user can act on, and it explains every NDEx entry going grey at once.
 */
export const useNdexGate = (
  enabled: boolean,
  tooltip: string,
): { disabled: boolean; tooltip: string } => {
  const online = useOnlineStatus()

  return online
    ? { disabled: !enabled, tooltip }
    : { disabled: true, tooltip: NDEX_OFFLINE_HINT }
}
