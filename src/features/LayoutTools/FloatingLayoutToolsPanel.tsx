import CloseIcon from '@mui/icons-material/Close'
import { Box, IconButton, Paper, Typography } from '@mui/material'
import { JSX, useState } from 'react'

import {
  DragBounds,
  DragPosition,
  PointerDraggable,
} from '@/components/PointerDraggable'
import { LayoutToolsPanel } from './LayoutToolsPanel'
import { useLayoutToolsPanelStore } from './store/layoutToolsPanelStore'

/** Class of the title bar, the only part of the panel that starts a drag */
const DRAG_HANDLE_CLASS = 'floating-layout-tools-drag-handle'

/**
 * Offsets that keep `panel` inside the padding box of the network view, its
 * offset parent, or `null` (no drag) when it has none. `offsetLeft`/
 * `offsetTop` ignore the transform, so they are the panel's position at
 * offset (0, 0).
 */
const dragLimits = (panel: HTMLElement): DragBounds | null => {
  const view = panel.offsetParent
  if (!(view instanceof HTMLElement)) {
    return null
  }
  return {
    left: -panel.offsetLeft,
    top: -panel.offsetTop,
    right: view.clientWidth - panel.offsetWidth - panel.offsetLeft,
    bottom: view.clientHeight - panel.offsetHeight - panel.offsetTop,
  }
}

/**
 * Floating Layout Tools panel shown in the lower-left corner of the network
 * canvas (CW-540), mirroring Cytoscape Desktop. Visibility is toggled from the
 * Layout menu. Mirrors the FloatingToolBar's absolute positioning so it sits
 * relative to the renderer.
 *
 * The panel can be moved by dragging its title bar, and stays inside the
 * network view while dragged (#887). It opens in the lower-left corner again
 * each time: the panel unmounts when closed, which drops the drag offset, so
 * closing and reopening also brings back a panel left out of view by a
 * resized canvas.
 *
 * The drag goes through `PointerDraggable`, which measures every move from
 * the press: react-draggable's `<Draggable>` adds each move to its last
 * committed position, and React 18 commits mouse-move updates in a later
 * task, so a move that arrives before the commit is lost and the panel falls
 * behind the pointer.
 */
export const FloatingLayoutToolsPanel = (): JSX.Element | null => {
  const open = useLayoutToolsPanelStore((state) => state.open)
  const setOpen = useLayoutToolsPanelStore((state) => state.setOpen)

  // Unmounted while closed, so it reopens with no offset
  return open ? <MovablePanel onClose={() => setOpen(false)} /> : null
}

const MovablePanel = ({ onClose }: { onClose: () => void }): JSX.Element => {
  const [offset, setOffset] = useState<DragPosition>({ x: 0, y: 0 })

  return (
    <PointerDraggable
      position={offset}
      onDrag={setOffset}
      bounds={dragLimits}
      handle={`.${DRAG_HANDLE_CLASS}`}
      cancel="button"
    >
      <Paper
        data-testid="floating-layout-tools-panel"
        elevation={4}
        sx={{
          position: 'absolute',
          bottom: '1em',
          left: '1em',
          zIndex: 1,
          width: 300,
          maxWidth: '80%',
          borderRadius: '0.5em',
          border: (theme) => `1px solid ${theme.palette.grey[800]}`,
        }}
      >
        <Box
          data-testid="floating-layout-tools-drag-handle"
          className={DRAG_HANDLE_CLASS}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1,
            py: 0.5,
            cursor: 'move',
            userSelect: 'none',
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="subtitle2">Layout Tools</Typography>
          <IconButton
            data-testid="floating-layout-tools-close"
            size="small"
            aria-label="Close layout tools"
            onClick={onClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ p: 1 }}>
          <LayoutToolsPanel />
        </Box>
      </Paper>
    </PointerDraggable>
  )
}
