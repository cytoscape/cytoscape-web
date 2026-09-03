import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  Box,
  Button,
  ClickAwayListener,
  Divider,
  Popper,
  Tooltip,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'

import { darkPalette } from '../../theme'
import { MENU_BAR_TRIGGER_ATTR, MenuOpenIntent, useMenuBar } from './MenuBar'
import { ToolbarMenuItem } from './menuItemModel'

interface DropdownMenuProps {
  id: string
  label: string
  menuItems: ToolbarMenuItem[]
  /**
   * Controlled open flag. Inside a MenuBar take it from `useMenuBarMenu(id)`,
   * so the bar can close this menu when another one opens.
   */
  open?: boolean
  minWidth?: number
  disabled?: boolean
  disabledTooltip?: React.ReactNode
  onOpenChange?: (open: boolean) => void
}

/**
 * Marks the element a template row activates on Enter or Space. The row owns
 * the keyboard; the click handler lives in the template.
 */
const MENU_ITEM_ACTION_ATTR = 'data-menuitem-action'

/**
 * Every level of a menu carries the id of the trigger it belongs to. Submenus
 * render through Popper portals, so they are not DOM descendants of the top
 * level and `contains()` cannot tell whether focus is still inside the menu.
 */
const MENU_OWNER_ATTR = 'data-menu-owner'

const MENU_SHADOW = '0px 4px 12px rgba(0, 0, 0, 0.15)'

/**
 * Rows of ONE level only: submenus are portals, so they are not descendants
 * of the level's container in the DOM. Template rows mark their disabled
 * state on the content inside the row, so filter those out too — otherwise
 * arrow navigation stops on rows that cannot be activated.
 */
const focusableRows = (container: HTMLElement | null): HTMLElement[] =>
  Array.from(
    container?.querySelectorAll<HTMLElement>(
      ':scope > [role="menuitem"][tabindex="0"]',
    ) ?? [],
  ).filter((row) => row.querySelector('[aria-disabled="true"]') === null)

const isInsideMenu = (element: Element | null, ownerId: string): boolean =>
  element !== null &&
  element.closest(`[${MENU_OWNER_ATTR}="${ownerId}"]`) !== null

/**
 * Renders one level of the menu model. An item with children opens its
 * submenu on hover (one open submenu per level, like the former primereact
 * TieredMenu); it stays open until a sibling is hovered or the menu closes.
 */
function MenuLevel({
  items,
  minWidth,
  menuId,
  ownerId,
  topLevel = false,
  autoFocus = false,
  onEscape,
  onNavigateMenuBar,
}: {
  items: ToolbarMenuItem[]
  minWidth?: number
  /** Id the trigger's aria-controls points at; set on the top level only. */
  menuId?: string
  /** Id of the DropdownMenu this level belongs to, on every level. */
  ownerId: string
  /** The level directly under the trigger: ArrowLeft moves along the menubar. */
  topLevel?: boolean
  /**
   * Where focus goes on mount: the first enabled row (keyboard-opened), the
   * level's container (pointer-opened, so the keys still work from the
   * moment it opens), or nowhere (hover-opened submenu).
   */
  autoFocus?: 'first-row' | 'container' | false
  /** Escape (or ArrowLeft in a submenu) with no submenu of our own open. */
  onEscape?: () => void
  /**
   * ArrowRight on a row without a submenu, or ArrowLeft at the top level:
   * the menubar opens the neighbouring menu (WAI-ARIA menubar pattern).
   */
  onNavigateMenuBar?: (delta: 1 | -1) => void
}): React.ReactElement {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const [openSubmenu, setOpenSubmenu] = useState<{
    index: number
    anchorEl: HTMLElement
    /** Opened from the keyboard, so focus must follow into the submenu. */
    fromKeyboard: boolean
  } | null>(null)

  useEffect(() => {
    if (autoFocus === 'first-row') {
      ;(focusableRows(containerRef.current)[0] ?? containerRef.current)?.focus()
    } else if (autoFocus === 'container') {
      containerRef.current?.focus()
    }
  }, [autoFocus])

  const moveFocus = (delta: number): void => {
    const rows = focusableRows(containerRef.current)
    if (rows.length === 0) {
      return
    }
    const current = rows.indexOf(document.activeElement as HTMLElement)
    // From the container (pointer-opened menu, no row focused yet) the
    // direction picks the entry row: ArrowDown the first, ArrowUp the last.
    const next =
      current === -1
        ? delta > 0
          ? 0
          : rows.length - 1
        : (current + delta + rows.length) % rows.length
    rows[next]?.focus()
  }

  const focusEdge = (edge: 'first' | 'last'): void => {
    const rows = focusableRows(containerRef.current)
    rows[edge === 'first' ? 0 : rows.length - 1]?.focus()
  }

  const closeSubmenu = (): void => {
    const anchor = openSubmenu?.anchorEl
    setOpenSubmenu(null)
    anchor?.focus()
  }

  return (
    <Box
      ref={containerRef}
      id={menuId}
      role="menu"
      tabIndex={-1}
      {...{ [MENU_OWNER_ATTR]: ownerId }}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        // Keydowns in a submenu bubble through its portal to every level
        // above, so each handled key stops here: the level above would
        // otherwise act on the same key (and move focus onto its own rows).
        switch (event.key) {
          case 'Escape':
            event.stopPropagation()
            if (openSubmenu !== null) {
              closeSubmenu()
            } else {
              onEscape?.()
            }
            return
          case 'ArrowLeft':
            event.stopPropagation()
            event.preventDefault()
            if (openSubmenu !== null) {
              closeSubmenu()
            } else if (!topLevel) {
              onEscape?.()
            } else {
              onNavigateMenuBar?.(-1)
            }
            return
          case 'ArrowRight':
            // A row with a submenu has already opened it and stopped the event.
            event.stopPropagation()
            event.preventDefault()
            onNavigateMenuBar?.(1)
            return
          case 'ArrowDown':
          case 'ArrowUp':
            event.stopPropagation()
            event.preventDefault()
            moveFocus(event.key === 'ArrowDown' ? 1 : -1)
            return
          case 'Home':
          case 'End':
            event.stopPropagation()
            event.preventDefault()
            focusEdge(event.key === 'Home' ? 'first' : 'last')
            return
          default:
            return
        }
      }}
      sx={{
        minWidth: minWidth ?? 200,
        maxWidth: 600,
        py: 0.5,
        outline: 'none',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {items.map((item, index) => {
        if (item.separator === true) {
          return <Divider key={index} sx={{ my: 0.5 }} />
        }

        const hasChildren = (item.items?.length ?? 0) > 0
        if (!hasChildren && item.template !== undefined) {
          // The row, not the template inside it, is the one focusable
          // menuitem: nesting a second one would show the row twice by role
          // and leave arrow navigation unable to reach it at all. Enter and
          // Space forward to the template's own click target, since the
          // command lives in the template.
          return (
            <Box
              key={index}
              role="menuitem"
              tabIndex={item.disabled === true ? -1 : 0}
              aria-disabled={item.disabled === true ? true : undefined}
              onMouseEnter={() => setOpenSubmenu(null)}
              onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
                if (
                  item.disabled === true ||
                  (event.key !== 'Enter' && event.key !== ' ')
                ) {
                  return
                }
                event.preventDefault()
                // App menu templates render a MUI MenuItem instead, so accept
                // either as the click target.
                event.currentTarget
                  .querySelector<HTMLElement>(
                    `[${MENU_ITEM_ACTION_ATTR}], [role="menuitem"]`,
                  )
                  ?.click()
              }}
            >
              {item.template}
            </Box>
          )
        }

        const activateRow = (
          target: HTMLElement,
          fromKeyboard = false,
        ): void => {
          if (item.disabled === true) {
            return
          }
          if (hasChildren) {
            setOpenSubmenu({ index, anchorEl: target, fromKeyboard })
            return
          }
          item.command?.()
        }

        const row = (
          <Box
            key={index}
            role="menuitem"
            tabIndex={item.disabled === true ? -1 : 0}
            aria-disabled={item.disabled === true ? true : undefined}
            aria-haspopup={hasChildren ? 'menu' : undefined}
            style={item.style}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              padding: '4px 16px',
              cursor: item.disabled === true ? 'default' : 'pointer',
              color:
                item.disabled === true
                  ? theme.palette.text.disabled
                  : theme.palette.text.primary,
              '&:hover': {
                backgroundColor:
                  item.disabled === true
                    ? theme.palette.background.paper
                    : theme.palette.action.hover,
              },
            }}
            onMouseEnter={(event: React.MouseEvent<HTMLElement>) => {
              setOpenSubmenu(
                hasChildren
                  ? {
                      index,
                      anchorEl: event.currentTarget,
                      fromKeyboard: false,
                    }
                  : null,
              )
            }}
            onClick={(event: React.MouseEvent<HTMLElement>) => {
              activateRow(event.currentTarget)
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                activateRow(event.currentTarget, true)
              }
              // ArrowRight opens a submenu; ArrowLeft is handled by the
              // submenu's own level, which closes itself and refocuses here.
              // Without a submenu the level container turns ArrowRight into
              // a move along the menubar instead.
              if (event.key === 'ArrowRight' && hasChildren) {
                event.preventDefault()
                event.stopPropagation()
                activateRow(event.currentTarget, true)
              }
            }}
          >
            {item.icon !== undefined ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </Box>
            ) : null}
            <Box sx={{ flexGrow: 1 }}>{item.label}</Box>
            {hasChildren ? <ChevronRightIcon fontSize="small" /> : null}
          </Box>
        )

        if (!hasChildren) {
          return row
        }

        return (
          <React.Fragment key={index}>
            {row}
            <Popper
              open={openSubmenu?.index === index}
              anchorEl={
                openSubmenu?.index === index ? openSubmenu.anchorEl : null
              }
              placement="right-start"
              sx={{ zIndex: theme.zIndex.modal + 1 }}
            >
              <Box
                sx={{
                  boxShadow: MENU_SHADOW,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <MenuLevel
                  items={item.items ?? []}
                  minWidth={minWidth}
                  ownerId={ownerId}
                  autoFocus={
                    openSubmenu?.fromKeyboard === true ? 'first-row' : false
                  }
                  onEscape={closeSubmenu}
                  onNavigateMenuBar={onNavigateMenuBar}
                />
              </Box>
            </Popper>
          </React.Fragment>
        )
      })}
    </Box>
  )
}

/**
 * A top-level toolbar menu. The dropdown is a non-modal Popper rather than a
 * Popover: a Popover is a modal with an invisible full-screen backdrop, so
 * while one menu was open a click on any other trigger only hit the backdrop
 * and closed the first menu — every switch cost two clicks, and hovering
 * across the bar could never move the open menu. Inside a MenuBar the open
 * flag comes from `useMenuBarMenu`, which is what keeps one menu open at a
 * time and lets hover and the arrow keys move between menus.
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  id,
  label,
  menuItems,
  open = false,
  minWidth,
  disabled = false,
  disabledTooltip = '',
  onOpenChange,
}) => {
  const theme = useTheme()
  const menuBar = useMenuBar()
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Intent of the current open when there is no menubar to record it.
  const [localIntent, setLocalIntent] = useState<MenuOpenIntent>('pointer')
  // Enter/Space on the trigger arrive as a click; remember they were keys.
  const keyboardActivationRef = useRef(false)
  // Whether keyboard focus is somewhere inside the open menu. Rows that are
  // unmounted on close fire no blur, so the flag survives to the close effect
  // and tells it to hand focus back to the trigger.
  const focusWithinRef = useRef(false)
  const isOpen = open && !disabled
  const isOpenRef = useRef(isOpen)
  const menuId = `${id}-menu`
  const openIntent = menuBar !== null ? menuBar.openIntent : localIntent

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  // Roving tabindex: the menubar needs to know this trigger exists (in
  // mount order) and whether it can take the tab stop. Registration and the
  // enabled flag are separate effects so a disabled toggle keeps the
  // trigger's position in the bar.
  const registerTrigger = menuBar?.registerTrigger
  const setTriggerEnabled = menuBar?.setTriggerEnabled
  useEffect(() => registerTrigger?.(id), [registerTrigger, id])
  useEffect(() => {
    setTriggerEnabled?.(id, !disabled)
  }, [setTriggerEnabled, id, disabled])

  // A menu that becomes disabled while open closes rather than lingering
  // behind a disabled trigger.
  useEffect(() => {
    if (open && disabled) {
      onOpenChange?.(false)
    }
  }, [open, disabled, onOpenChange])

  // Hand focus back to the trigger when the menu closes with focus inside it
  // (Escape, or a row activated by keyboard or click) — unless another menu
  // in the bar took over by hover or arrow key, in which case focus is its.
  useEffect(() => {
    if (isOpen || !focusWithinRef.current) {
      return
    }
    focusWithinRef.current = false
    if (menuBar === null || menuBar.openId === null) {
      buttonRef.current?.focus()
    }
  }, [isOpen, menuBar])

  const requestOpen = (intent: MenuOpenIntent): void => {
    if (disabled) {
      return
    }
    if (menuBar !== null) {
      menuBar.setOpenIntent(intent)
    } else {
      setLocalIntent(intent)
    }
    onOpenChange?.(true)
  }

  const close = (): void => {
    onOpenChange?.(false)
  }

  /**
   * Moves along the menubar. With `openTarget` the neighbouring menu opens
   * with focus on its first row; otherwise only its trigger takes focus.
   */
  const navigateMenuBar = (delta: 1 | -1, openTarget: boolean): void => {
    if (menuBar === null) {
      return
    }
    const triggers = menuBar.getTriggers()
    const current = buttonRef.current
    const index = current === null ? -1 : triggers.indexOf(current)
    if (triggers.length === 0 || index === -1) {
      return
    }
    const next = triggers[(index + delta + triggers.length) % triggers.length]
    if (next === undefined || next === current) {
      return
    }
    const nextId = next.getAttribute(MENU_BAR_TRIGGER_ATTR)
    if (openTarget && nextId !== null) {
      menuBar.openMenu(nextId, 'keyboard')
    } else {
      next.focus()
    }
  }

  const handleClick = (): void => {
    if (disabled) {
      return
    }
    const fromKeyboard = keyboardActivationRef.current
    keyboardActivationRef.current = false
    if (open) {
      close()
    } else {
      requestOpen(fromKeyboard ? 'keyboard' : 'pointer')
    }
  }

  return (
    <>
      <Tooltip title={disabled ? disabledTooltip : ''}>
        <span>
          <Button
            ref={buttonRef}
            data-testid={`toolbar-${id}-menu-button`}
            {...{ [MENU_BAR_TRIGGER_ATTR]: id }}
            // A menubar's triggers are its menuitems; standalone the button
            // keeps its native role, since a menuitem outside a menubar is
            // invalid ARIA.
            role={menuBar === null ? undefined : 'menuitem'}
            // Roving tabindex: the bar is one Tab stop, on the trigger last used.
            tabIndex={
              menuBar === null ? undefined : menuBar.tabStopId === id ? 0 : -1
            }
            onFocus={() => {
              menuBar?.setActiveId(id)
            }}
            disabled={disabled}
            sx={{
              color: darkPalette.text.primary,
              textTransform: 'none',
              '&.Mui-disabled': {
                color: darkPalette.text.disabled,
              },
            }}
            id={`${id}-dropdown`}
            aria-controls={isOpen ? menuId : undefined}
            aria-haspopup="true"
            aria-expanded={isOpen ? 'true' : undefined}
            onClick={handleClick}
            onPointerDown={() => {
              keyboardActivationRef.current = false
            }}
            onPointerEnter={(event: React.PointerEvent<HTMLButtonElement>) => {
              // Desktop menubar behaviour: once any menu is open, the pointer
              // carries it across the bar. A tap (touch or pen) fires pointerenter
              // right before its click, which would open here and then toggle
              // closed again, so hover is mouse-only.
              if (
                disabled ||
                isOpen ||
                menuBar === null ||
                menuBar.openId === null ||
                event.pointerType !== 'mouse'
              ) {
                return
              }
              requestOpen('pointer')
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
              if (disabled) {
                return
              }
              switch (event.key) {
                case 'Enter':
                case ' ':
                  keyboardActivationRef.current = true
                  return
                case 'ArrowDown':
                case 'ArrowUp': {
                  event.preventDefault()
                  if (!isOpen) {
                    requestOpen('keyboard')
                    return
                  }
                  const rows = focusableRows(document.getElementById(menuId))
                  const row =
                    event.key === 'ArrowDown' ? rows[0] : rows[rows.length - 1]
                  row?.focus()
                  return
                }
                case 'ArrowLeft':
                case 'ArrowRight':
                  if (menuBar === null) {
                    return
                  }
                  event.preventDefault()
                  navigateMenuBar(event.key === 'ArrowRight' ? 1 : -1, isOpen)
                  return
                case 'Escape':
                  if (isOpen) {
                    event.preventDefault()
                    close()
                  }
                  return
                default:
                  return
              }
            }}
          >
            {label}
          </Button>
        </span>
      </Tooltip>
      <Popper
        open={isOpen}
        anchorEl={buttonRef.current}
        placement="bottom-start"
        // Above the workspace panes, below dialogs (which close the menu
        // first anyway); submenus sit one step higher.
        sx={{ zIndex: theme.zIndex.modal }}
      >
        <ClickAwayListener onClickAway={close}>
          <Box
            onFocus={() => {
              focusWithinRef.current = true
            }}
            onBlur={() => {
              focusWithinRef.current = false
              // Focus events also arrive from the submenu portals, since
              // React bubbles them through the tree. Decide after the browser
              // has settled the new focus target: Tab out of the menu, or a
              // click on something focusable elsewhere, closes it; moving
              // between rows, into a submenu or back to the trigger does not.
              queueMicrotask(() => {
                if (!isOpenRef.current) {
                  return
                }
                const active = document.activeElement
                if (active === buttonRef.current || isInsideMenu(active, id)) {
                  focusWithinRef.current = true
                  return
                }
                close()
              })
            }}
            // Keep focus where it is while clicking around the menu: a click
            // on a separator or the padding would otherwise blur the menu and
            // close it, and selecting text in a menu is never wanted.
            onMouseDown={(event: React.MouseEvent<HTMLElement>) => {
              event.preventDefault()
            }}
            sx={{
              boxShadow: MENU_SHADOW,
              backgroundColor: theme.palette.background.paper,
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <MenuLevel
              items={menuItems}
              minWidth={minWidth}
              menuId={menuId}
              ownerId={id}
              topLevel={true}
              // Focus moves into the menu either way, so the arrow keys,
              // Escape and Tab work from the moment it opens; a keyboard
              // open lands on the first row directly.
              autoFocus={openIntent === 'keyboard' ? 'first-row' : 'container'}
              onEscape={close}
              onNavigateMenuBar={
                menuBar === null
                  ? undefined
                  : (delta) => navigateMenuBar(delta, true)
              }
            />
          </Box>
        </ClickAwayListener>
      </Popper>
    </>
  )
}

interface DropdownMenuItemProps {
  label: string
  tooltip?: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
  onClick?: () => void
  /** Optional test anchor, so specs need not select the item by its label. */
  dataTestId?: string
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  label,
  tooltip = '',
  icon = null,
  disabled = false,
  onClick,
  dataTestId,
}) => {
  const theme = useTheme()

  return (
    <Tooltip title={tooltip} placement="right">
      <span>
        <Box
          data-testid={dataTestId}
          {...{ [MENU_ITEM_ACTION_ATTR]: '' }}
          aria-disabled={disabled ? true : undefined}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            padding: '4px 16px',
            cursor: disabled ? 'default' : 'pointer',
            color: disabled
              ? theme.palette.text.disabled
              : theme.palette.text.primary,
            '&:hover': {
              backgroundColor: disabled
                ? theme.palette.background.paper
                : theme.palette.action.hover,
            },
          }}
          onClick={() => {
            if (!disabled && onClick) {
              onClick()
            }
          }}
        >
          <Box sx={{ width: 24, height: 24 }}>{icon}</Box>
          <Box>{label}</Box>
        </Box>
      </span>
    </Tooltip>
  )
}
