import { useEffect } from 'react'

import { logUi } from '../../../debug'
import { selectAll } from '../../../data/select/selectCommands'
import { getSelectTargetNetworkId } from './selectTarget'

/**
 * Whether the platform's command key is ⌘ rather than Ctrl. Either source
 * may name it: `userAgentData` can disagree with `navigator.platform` (an
 * automated Chromium on macOS reports "Windows" there).
 */
export const isApplePlatform = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const userAgentData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData
  return [userAgentData?.platform, navigator.platform].some(
    (platform) =>
      platform !== undefined && /mac|iphone|ipad|ipod/i.test(platform),
  )
}

/** The Select All row's shortcuts in `aria-keyshortcuts` form */
export const SELECT_ALL_KEY_SHORTCUTS = 'Control+A Meta+A'

/** The Select All shortcut as the menu shows it */
export const selectAllShortcutLabel = (): string =>
  isApplePlatform() ? '⌘A' : 'Ctrl+A'

/**
 * Whether the keydown is the Select All shortcut: Ctrl+A or ⌘A, with no
 * other modifier. Both are accepted on every platform rather than trusting
 * the platform detection; ⌘A rarely reaches a page outside macOS (the
 * system takes the Windows key), and Ctrl+A on macOS only does something in
 * text fields, which keep it.
 */
export const isSelectAllShortcut = (event: KeyboardEvent): boolean =>
  (event.key === 'a' || event.key === 'A') &&
  !event.shiftKey &&
  !event.altKey &&
  event.metaKey !== event.ctrlKey

/**
 * Whether the network canvas has the keyboard: nothing has focus (clicking
 * the canvas, which is not focusable, leaves the focus on the body) or the
 * focus is inside a network renderer. A text field, the table browser, an
 * open menu or a dialog keeps its own Ctrl/⌘+A.
 */
export const isCanvasFocused = (doc: Document = document): boolean => {
  const active = doc.activeElement
  return (
    active === null ||
    active === doc.body ||
    active === doc.documentElement ||
    active.closest('[data-testid="cyjs-renderer"]') !== null
  )
}

/**
 * Ctrl/⌘+A selects every node and edge of the Select menu's network (Select
 * All), while the network canvas has the keyboard
 */
export const useSelectAllShortcut = (): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        !isSelectAllShortcut(event) ||
        !isCanvasFocused()
      ) {
        return
      }
      const networkId = getSelectTargetNetworkId()
      if (networkId === '' || !selectAll(networkId)) return
      // Keep the browser from selecting the page's text
      event.preventDefault()
      logUi.info(`[useSelectAllShortcut]: selected all of ${networkId}`)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
