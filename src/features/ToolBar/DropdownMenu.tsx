import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Box, Button, Divider, Popover, Popper, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import * as React from 'react'
import { useEffect, useState } from 'react'

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
 * Renders one level of the menu model. An item with children opens its
 * submenu on hover (one open submenu per level, like the former primereact
 * TieredMenu); it stays open until a sibling is hovered or the menu closes.
 */
function MenuLevel({
  items,
  minWidth,
}: {
  items: ToolbarMenuItem[]
  minWidth?: number
}): React.ReactElement {
  const theme = useTheme()
  const [openSubmenu, setOpenSubmenu] = useState<{
    index: number
    anchorEl: HTMLElement
  } | null>(null)

  return (
    <Box
      role="menu"
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
          return (
            <Box
              key={index}
              role="menuitem"
              onMouseEnter={() => setOpenSubmenu(null)}
            >
              {item.template}
            </Box>
          )
        }

        const activateRow = (target: HTMLElement): void => {
          if (item.disabled === true) {
            return
          }
          if (hasChildren) {
            setOpenSubmenu({ index, anchorEl: target })
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
                  ? { index, anchorEl: event.currentTarget }
                  : null,
              )
            }}
            onClick={(event: React.MouseEvent<HTMLElement>) => {
              activateRow(event.currentTarget)
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                activateRow(event.currentTarget)
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
              anchorEl={openSubmenu?.index === index ? openSubmenu.anchorEl : null}
              placement="right-start"
              sx={{ zIndex: theme.zIndex.modal + 1 }}
            >
              <Box
                sx={{
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <MenuLevel items={item.items ?? []} minWidth={minWidth} />
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
            aria-controls={open ? 'basic-menu' : undefined}
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
        <MenuLevel items={menuItems} minWidth={minWidth} />
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
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled ? true : undefined}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            padding: '4px 16px',
            cursor: disabled ? 'default' : 'pointer',
            color: disabled ? theme.palette.text.disabled : theme.palette.text.primary,
            '&:hover': {
              backgroundColor: disabled ? theme.palette.background.paper : theme.palette.action.hover,
            },
          }}
          onClick={() => {
            if (!disabled && onClick) {
              onClick()
            }
          }}
          onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
            if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
              event.preventDefault()
              onClick?.()
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
