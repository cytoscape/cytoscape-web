import { createContext, useContext } from 'react'

/**
 * Whether the views below may change the network: true inside the embed
 * (`/embed/:networkId`), false everywhere else.
 *
 * Most editing paths are closed in the embed by not mounting them (menus,
 * shortcuts, the table browser). This switch covers the ones inside components
 * the embed shares with the editor: the renderer's right-click menu and node
 * drag, and the floating toolbar's editing buttons.
 *
 * Not `NetworkSummary.isReadOnly`, which is NDEx's per-network permission.
 */
export const ReadOnlyContext = createContext<boolean>(false)

export const useReadOnly = (): boolean => useContext(ReadOnlyContext)
