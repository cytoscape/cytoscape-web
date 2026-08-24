import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Box, Button, Divider, Popover, Popper, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'

import { darkPalette } from '../../theme'
import { ToolbarMenuItem } from './menuItemModel'

interface DropdownMenuProps {
  id: string
  label: string
  menuItems: ToolbarMenuItem[]
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
 * Renders one level of the menu model. An item with children opens its
 * submenu on hover (one open submenu per level, like the former primereact
 * TieredMenu); it stays open until a sibling is hovered or the menu closes.
 */
function MenuLevel({
  items,
  minWidth,
  menuId,
  autoFocus = false,
  onEscape,
}: {
  items: ToolbarMenuItem[]
  minWidth?: number
  /** Id the trigger's aria-controls points at; set on the top level only. */
  menuId?: string
  /** Move focus to the first enabled row on mount (keyboard-opened submenu). */
  autoFocus?: boolean
  /** Escape with no submenu of our own open — the level above closes us. */
  onEscape?: () => void
}): React.ReactElement {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const [openSubmenu, setOpenSubmenu] = useState<{
    index: number
    anchorEl: HTMLElement
    /** Opened from the keyboard, so focus must follow into the submenu. */
    fromKeyboard: boolean
  } | null>(null)

  // Rows of THIS level only: submenus render through a Popper portal, so they
  // are not descendants of this container in the DOM. Template rows mark their
  // disabled state on the content inside the row, so filter those out too —
  // otherwise arrow navigation stops on rows that cannot be activated.
  const focusableRows = (): HTMLElement[] =>
    Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>(
        ':scope > [role="menuitem"][tabindex="0"]',
      ) ?? [],
    ).filter((row) => row.querySelector('[aria-disabled="true"]') === null)

  useEffect(() => {
    if (autoFocus) {
      focusableRows()[0]?.focus()
    }
  }, [autoFocus])

  const moveFocus = (delta: number): void => {
    const rows = focusableRows()
    if (rows.length === 0) {
      return
    }
    const current = rows.indexOf(document.activeElement as HTMLElement)
    const next =
      current === -1 ? 0 : (current + delta + rows.length) % rows.length
    rows[next]?.focus()
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
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        // Escape and ArrowLeft both back out one level. Only stop propagation
        // when this level actually handles it — at the top level the event must
        // reach the Popover, which closes the whole menu.
        if (event.key === 'Escape' || event.key === 'ArrowLeft') {
          if (openSubmenu !== null) {
            event.stopPropagation()
            closeSubmenu()
          } else if (onEscape !== undefined) {
            event.stopPropagation()
            onEscape()
          }
          return
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          moveFocus(event.key === 'ArrowDown' ? 1 : -1)
        }
      }}
      sx={{
        minWidth: minWidth ?? 200,
        maxWidth: 600,
        py: 0.5,
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
              tabIndex={0}
              onMouseEnter={() => setOpenSubmenu(null)}
              onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
                if (event.key !== 'Enter' && event.key !== ' ') {
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
              if (event.key === 'ArrowRight' && hasChildren) {
                event.preventDefault()
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
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <MenuLevel
                  items={item.items ?? []}
                  minWidth={minWidth}
                  autoFocus={openSubmenu?.fromKeyboard === true}
                  onEscape={closeSubmenu}
                />
              </Box>
            </Popper>
          </React.Fragment>
        )
      })}
    </Box>
  )
}

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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const menuId = `${id}-menu`

  useEffect(() => {
    if (!open || disabled) {
      setAnchorEl(null)
    }
  }, [open, disabled])

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (disabled) {
      return
    }
    if (open) {
      setAnchorEl(null)
      onOpenChange?.(false)
    } else {
      setAnchorEl(event.currentTarget)
      onOpenChange?.(true)
    }
  }

  return (
    <>
      <Tooltip title={disabled ? disabledTooltip : ''}>
        <span>
          <Button
            data-testid={`toolbar-${id}-menu-button`}
            disabled={disabled}
            sx={{
              color: darkPalette.text.primary,
              textTransform: 'none',
              '&.Mui-disabled': {
                color: darkPalette.text.disabled,
              },
            }}
            id={`${id}-dropdown`}
            aria-controls={open ? menuId : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleClick}
          >
            {label}
          </Button>
        </span>
      </Tooltip>
      <Popover
        open={open && !disabled && anchorEl !== null}
        anchorEl={anchorEl}
        onClose={() => onOpenChange?.(false)}
        // No open/close animation: menus feel snappier and interactions
        // cannot race a transition (the former TieredMenu had none either).
        transitionDuration={0}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{
          '& .MuiPopover-paper': {
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
            backgroundColor: theme.palette.background.paper,
          },
        }}
      >
        <MenuLevel items={menuItems} minWidth={minWidth} menuId={menuId} />
      </Popover>
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
