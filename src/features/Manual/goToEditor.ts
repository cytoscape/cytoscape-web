import { CYWEB_TAB_PREFIX } from '@/data/tabState/tabId'
import { resolveDbScope } from '@/data/db/dbScope'
import { logUi } from '@/debug'
import { ensureTrailingSlash } from '@/utils/baseUrl'

/**
 * The manual's "Go to Cytoscape Web" button: back to the editor tab that
 * opened the manual, or the editor in this tab when there is none.
 *
 * Help → User Manual opens the manual with `window.open` and keeps the opener
 * (`TutorialMenuItem.tsx`), so the manual tab holds a reference to that editor
 * tab. A page cannot reliably bring another tab to the front: browsers limit
 * it to stop pop-under abuse, and which request they honour differs (see
 * `raise`). So the button makes every request a browser might honour, then
 * checks a moment later whether this tab still has focus. If it does, the
 * browser declined, and the editor opens here instead. The worst case is
 * therefore a second editor tab, never a click that does nothing.
 *
 * Both paths are full page loads or tab switches, never a client-side route
 * change: the manual and the editor use different databases
 * (`src/data/db/dbScope.ts`).
 */

/** How long the editor tab has to take focus before this tab stops waiting. */
export const FOCUS_SETTLE_MS = 300

/** Fragment of the cancelled navigation that makes Firefox switch tabs. */
export const FOCUS_FRAGMENT = 'cyweb-focus'

/**
 * The editor tab that opened this manual tab, or null when there is none to go
 * back to: the manual was opened another way (a bookmark, a typed URL, the
 * web-manual redirect), that tab was closed, or it has left the editor — for
 * another site, another page on the same origin, or the manual.
 */
export const findOpenerEditor = (
  win: Window,
  baseUrl: string,
): Window | null => {
  const opener = win.opener as Window | null
  if (opener == null || opener.closed) {
    return null
  }
  try {
    const { origin, pathname } = opener.location
    const onEditor =
      origin === win.location.origin &&
      `${pathname}/`.startsWith(ensureTrailingSlash(baseUrl)) &&
      resolveDbScope(pathname, baseUrl) === 'app'
    return onEditor ? opener : null
  } catch {
    // Reading another origin's location throws: the tab has left the app.
    return null
  }
}

const isBlank = (tab: Window): boolean => {
  try {
    return tab.location.href === 'about:blank'
  } catch {
    return false
  }
}

const noCleanup = (): void => {}

/**
 * Firefox ignores `focus()` and the empty-URL `window.open`: it switches tabs
 * only for a navigation of the other tab started by a click
 * (`NavigationShouldTakeFocus` in its nsDocShell.cpp), and an empty URL
 * navigates nothing. So this navigates the editor to its own URL plus a
 * fragment — a same-document navigation, never a reload — and cancels it from
 * the editor's `navigate` event (Navigation API), which leaves its address and
 * history as they were. Firefox switches to the tab even so.
 *
 * Without the Navigation API the navigation could not be cancelled and would
 * leave a history entry behind, so it is skipped. The listener stays until
 * the returned cleanup runs: WebKit may start the navigation in a later task.
 */
const navigateInPlace = (
  win: Window,
  editor: Window,
  name: string,
): (() => void) => {
  const navigation = editor.navigation as Navigation | undefined
  if (navigation == null) {
    return noCleanup
  }
  const url = new URL(editor.location.href)
  url.hash = FOCUS_FRAGMENT
  const destination = url.href
  const cancel = (event: NavigateEvent): void => {
    if (event.destination.url === destination) {
      event.preventDefault()
    }
  }
  navigation.addEventListener('navigate', cancel)
  win.open(destination, name)
  return () => {
    try {
      navigation.removeEventListener('navigate', cancel)
    } catch {
      // The editor tab was closed meanwhile; nothing is left to clean up.
    }
  }
}

/**
 * Asks the browser, every way one of them honours, to bring `editor` forward:
 * `focus()`, then `window.open('', <tab name>)` with the editor's addressable
 * name (`src/boot/tabManager.ts`) for Chrome and Safari, then
 * `navigateInPlace` for Firefox. Returns the cleanup for the settle check.
 */
const raise = (win: Window, editor: Window): (() => void) => {
  editor.focus()
  // Only a name this app gave the tab: anything else may not be unique.
  const name = editor.name
  if (!name.startsWith(`${CYWEB_TAB_PREFIX}-`)) {
    return noCleanup
  }
  // The empty URL targets the named tab without loading anything into it.
  const target = win.open('', name)
  if (target == null || isBlank(target)) {
    // A browser that cannot find the tab by name opens a blank one instead.
    // A navigation by that name would then open the editor in a new tab.
    target?.close()
    return noCleanup
  }
  if (target !== editor) {
    // Another tab holds the name, e.g. a duplicate of the editor. The
    // navigation would reach that tab, where nothing cancels it.
    return noCleanup
  }
  return navigateInPlace(win, editor, name)
}

export const goToEditor = (win: Window, baseUrl: string): void => {
  const editor = findOpenerEditor(win, baseUrl)
  if (editor == null) {
    win.location.assign(baseUrl)
    return
  }

  logUi.info('[goToEditor]: switching to the editor tab that opened the manual')
  const cleanup = raise(win, editor)
  win.setTimeout(() => {
    cleanup()
    if (win.document.hasFocus()) {
      logUi.info(
        '[goToEditor]: the browser kept focus on the manual; opening the editor here',
      )
      win.location.assign(baseUrl)
    }
  }, FOCUS_SETTLE_MS)
}
