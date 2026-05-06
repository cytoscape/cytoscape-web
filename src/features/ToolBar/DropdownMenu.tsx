import { Button, Tooltip } from '@mui/material'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { PrimeReactProvider } from 'primereact/api'
import { OverlayPanel } from 'primereact/overlaypanel'
import { TieredMenu } from 'primereact/tieredmenu'
import * as React from 'react'
import { useEffect, useRef } from 'react'


interface DropdownMenuProps {
  id: string
  label: string
  menuItems: any[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  id,
  label,
  menuItems,
  open = false,
  onOpenChange,
}) => {
  const overlayPanelRef = useRef(null)

  useEffect(() => {
    if (!open) {
      (overlayPanelRef.current as any)?.hide()
    }
  }, [open])

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    (overlayPanelRef.current as any)?.toggle(event)
  }

  // If the cytoscape container exists, use its bounding rect to position the overlay,
  // otherwise default to covering the entire viewport
  const cyContainer = document.getElementById('cy-container')
  const overlayTarget = cyContainer ? cyContainer : 'body'
  const overlayTargetRect = overlayTarget !== 'body' ? overlayTarget.getBoundingClientRect() : null

  return (
    <>
    {open && (
      // Invisible overlay to capture clicks outside the menu
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
          ;(overlayPanelRef.current as any)?.hide()
          onOpenChange?.(false)
        }}
      />
    )}
      <PrimeReactProvider>
        <Button
          data-testid={`toolbar-${id}-menu-button`}
          sx={{
            color: 'white',
            textTransform: 'none',
          }}
          id={`${id}-dropdown`}
          aria-controls={open ? 'basic-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
        >
          {label}
        </Button>
        <OverlayPanel
          ref={overlayPanelRef}
          onShow={() => onOpenChange?.(true)}
          onHide={() => onOpenChange?.(false)}
          unstyled
        >
          <TieredMenu
            style={{ 
              minWidth: 350,
              maxWidth: 500,
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
  tooltip?: string
  icon?: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  label,
  tooltip = '',
  icon = null,
  disabled = false,
  onClick,
}) => {
  const theme = useTheme()

  return (
    <Tooltip title={tooltip} placement="right">
      <span>
        <Box
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
