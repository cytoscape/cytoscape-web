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
  /**
   * Id of the one trigger in the Tab order (roving tabindex): the menubar is
   * a single tab stop, and the arrow keys move between its triggers. Null
   * until a trigger has registered.
   */
  tabStopId: string | null
  /** A trigger took focus, so it becomes the tab stop. */
  setActiveId: (id: string) => void
  /**
   * Triggers announce themselves (in mount order, which is menubar order)
   * and whether they are enabled, so the tab stop can start on the first
   * enabled trigger and leave one that becomes disabled. Returns the
   * unregister function.
   */
  registerTrigger: (id: string) => () => void
  setTriggerEnabled: (id: string, enabled: boolean) => void
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

/** Registered triggers in menubar order, with whether each is enabled. */
type TriggerRegistry = Map<string, boolean>

const firstEnabled = (triggers: TriggerRegistry): string | null => {
  for (const [id, enabled] of triggers) {
    if (enabled) {
      return id
    }
  }
  return null
}

/**
 * Container for the toolbar's top-level menus. It owns which menu is open,
 * which is what makes the bar behave like a desktop menubar: one click opens
 * a menu, and from then on hovering or arrowing across the other triggers
 * moves the open menu with the pointer instead of asking for another click.
 * It also owns the bar's single Tab stop (roving tabindex), so Tab treats the
 * whole bar as one control and lands on the trigger last used.
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

  // Roving tabindex: the registry keeps menubar order (a Map keeps insertion
  // order, and triggers register in mount order), `activeId` is the trigger
  // that last had focus. The tab stop is the active trigger while it is
  // enabled; a trigger that becomes disabled hands the stop to the first
  // enabled one for good, so re-enabling it does not yank the stop back.
  const [triggers, setTriggers] = useState<TriggerRegistry>(() => new Map())
  const [activeId, setActiveId] = useState<string | null>(null)

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

  const registerTrigger = useCallback((id: string): (() => void) => {
    setTriggers((current) => {
      if (current.has(id)) {
        return current
      }
      const next = new Map(current)
      // Enabled until the trigger reports otherwise; setTriggerEnabled runs
      // right after registration.
      next.set(id, true)
      return next
    })
    return () => {
      setTriggers((current) => {
        if (!current.has(id)) {
          return current
        }
        const next = new Map(current)
        next.delete(id)
        return next
      })
      setActiveId((current) => (current === id ? null : current))
    }
  }, [])

  const setTriggerEnabled = useCallback(
    (id: string, enabled: boolean): void => {
      setTriggers((current) => {
        if (current.get(id) === enabled) {
          return current
        }
        const next = new Map(current)
        next.set(id, enabled)
        return next
      })
      if (!enabled) {
        setActiveId((current) => (current === id ? null : current))
      }
    },
    [],
  )

  const tabStopId = useMemo(
    () =>
      activeId !== null && triggers.get(activeId) === true
        ? activeId
        : firstEnabled(triggers),
    [activeId, triggers],
  )

  const value = useMemo<MenuBarContextValue>(
    () => ({
      openId: state.openId,
      openIntent: state.openIntent,
      openMenu,
      closeMenu,
      setOpenIntent,
      getTriggers,
      tabStopId,
      setActiveId,
      registerTrigger,
      setTriggerEnabled,
    }),
    [
      state,
      openMenu,
      closeMenu,
      setOpenIntent,
      getTriggers,
      tabStopId,
      registerTrigger,
      setTriggerEnabled,
    ],
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
