import { Box, BoxProps } from '@mui/material'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

/**
 * Set on every top-level menu trigger inside a MenuBar. The menubar reads
 * these in DOM order to move between menus with the arrow keys.
 */
export const MENU_BAR_TRIGGER_ATTR = 'data-menubar-trigger'

/** How a menu was asked to open, which decides where focus lands. */
export type MenuOpenIntent = 'pointer' | 'keyboard'

export interface MenuBarContextValue {
  /** Id of the one open menu, or null. This is the single source of truth. */
  openId: string | null
  /** How the open menu was asked to open; meaningful while openId is set. */
  openIntent: MenuOpenIntent
  /**
   * Opens `id`, closing whichever menu was open. Without an explicit intent
   * the one recorded by setOpenIntent is used (and cleared), so an open that
   * goes through a parent's setOpen can still say the keyboard asked for it.
   */
  openMenu: (id: string, intent?: MenuOpenIntent) => void
  /** Closes `id` if it is the open menu; a no-op for any other id. */
  closeMenu: (id: string) => void
  /** Records the intent for the next openMenu call that names none. */
  setOpenIntent: (intent: MenuOpenIntent) => void
  /** Enabled top-level triggers, in menubar order. */
  getTriggers: () => HTMLButtonElement[]
}

const MenuBarContext = createContext<MenuBarContextValue | null>(null)

/** The enclosing MenuBar, or null when a DropdownMenu is used on its own. */
export const useMenuBar = (): MenuBarContextValue | null =>
  useContext(MenuBarContext)

/**
 * Open flag for the menu `id`, shared with every other menu in the MenuBar so
 * that at most one is open: opening this one closes whichever was open.
 * Outside a MenuBar it degrades to a private flag, so a DropdownMenu can still
 * be rendered standalone (dialogs, tests).
 */
export const useMenuBarMenu = (
  id: string,
): { open: boolean; setOpen: (open: boolean) => void } => {
  const menuBar = useMenuBar()
  const openMenu = menuBar?.openMenu
  const closeMenu = menuBar?.closeMenu
  const [localOpen, setLocalOpen] = useState(false)

  const setOpen = useCallback(
    (open: boolean): void => {
      if (openMenu === undefined || closeMenu === undefined) {
        setLocalOpen(open)
        return
      }
      if (open) {
        openMenu(id)
      } else {
        closeMenu(id)
      }
    },
    [openMenu, closeMenu, id],
  )

  return {
    open: menuBar === null ? localOpen : menuBar.openId === id,
    setOpen,
  }
}

/**
 * Container for the toolbar's top-level menus. It owns which menu is open,
 * which is what makes the bar behave like a desktop menubar: one click opens
 * a menu, and from then on hovering or arrowing across the other triggers
 * moves the open menu with the pointer instead of asking for another click.
 */
export const MenuBar = ({ children, ...boxProps }: BoxProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null)
  // Intent announced ahead of an openMenu call that names none.
  const pendingIntentRef = useRef<MenuOpenIntent>('pointer')
  // The intent travels with the id so a menu learns how it was opened in the
  // same render that opens it — its dropdown mounts through a portal, one
  // render later, and decides where focus lands from this value.
  const [state, setState] = useState<{
    openId: string | null
    openIntent: MenuOpenIntent
  }>({ openId: null, openIntent: 'pointer' })

  const setOpenIntent = useCallback((intent: MenuOpenIntent): void => {
    pendingIntentRef.current = intent
  }, [])

  const openMenu = useCallback((id: string, intent?: MenuOpenIntent): void => {
    const openIntent = intent ?? pendingIntentRef.current
    pendingIntentRef.current = 'pointer'
    setState({ openId: id, openIntent })
  }, [])

  const closeMenu = useCallback((id: string): void => {
    setState((current) =>
      current.openId === id ? { openId: null, openIntent: 'pointer' } : current,
    )
  }, [])

  const getTriggers = useCallback((): HTMLButtonElement[] => {
    const container = containerRef.current
    if (container === null) {
      return []
    }
    return Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        `button[${MENU_BAR_TRIGGER_ATTR}]:not(:disabled)`,
      ),
    )
  }, [])

  const value = useMemo<MenuBarContextValue>(
    () => ({
      openId: state.openId,
      openIntent: state.openIntent,
      openMenu,
      closeMenu,
      setOpenIntent,
      getTriggers,
    }),
    [state, openMenu, closeMenu, setOpenIntent, getTriggers],
  )

  return (
    <MenuBarContext.Provider value={value}>
      <Box
        ref={containerRef}
        role="menubar"
        aria-label="Main menu"
        data-testid="toolbar-menubar"
        {...boxProps}
      >
        {children}
      </Box>
    </MenuBarContext.Provider>
  )
}
