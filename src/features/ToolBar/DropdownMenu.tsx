import { Button, Tooltip } from '@mui/material'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { PrimeReactProvider } from 'primereact/api'
import { OverlayPanel } from 'primereact/overlaypanel'
import { TieredMenu } from 'primereact/tieredmenu'
import * as React from 'react'
import { useEffect, useRef } from 'react'

import { darkPalette } from '../../theme'


interface DropdownMenuProps {
  id: string
  label: string
  menuItems: any[]
  open?: boolean
  minWidth?: number
  disabled?: boolean
  disabledTooltip?: React.ReactNode
  onOpenChange?: (open: boolean) => void
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
  const overlayPanelRef = useRef<OverlayPanel>(null)
  const theme = useTheme()

  useEffect(() => {
    if (!open || disabled) {
      overlayPanelRef.current?.hide()
    }
  }, [open, disabled])

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (disabled) {
      return
    }
    overlayPanelRef.current?.toggle(event)
  }

  // If the cytoscape container exists, use its bounding rect to position the "click outside" overlay,
  // otherwise default to covering the entire viewport
  const cyContainer = document.getElementById('cy-container')
  const overlayTarget = cyContainer ? cyContainer : 'body'
  const overlayTargetRect = overlayTarget !== 'body' ? overlayTarget.getBoundingClientRect() : null

  return (
    <>
    {open && !disabled && (
      // Invisible "click outside" overlay to capture clicks outside the menu
      <Box
        sx={{
          position: 'fixed',
          top: overlayTargetRect ? overlayTargetRect.top : 0,
          left: overlayTargetRect ? overlayTargetRect.left : 0,
          width: overlayTargetRect ? overlayTargetRect.width : '100vw',
          height: overlayTargetRect ? overlayTargetRect.height : '100vh',
          zIndex: 1000, // Just below the menu
        }}
        onClick={() => {
          overlayPanelRef.current?.hide()
          onOpenChange?.(false)
        }}
      />
    )}
      <PrimeReactProvider>
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
        <OverlayPanel
          ref={overlayPanelRef}
          onShow={() => onOpenChange?.(true)}
          onHide={() => onOpenChange?.(false)}
          unstyled
        >
          <TieredMenu
            style={{ 
              minWidth: minWidth ?? 200,
              maxWidth: 600,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            model={menuItems}
          />
        </OverlayPanel>
      </PrimeReactProvider>
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
        >
          <Box sx={{ width: 24, height: 24 }}>{icon}</Box>
          <Box>{label}</Box>
        </Box>
      </span>
    </Tooltip>
  )
}
