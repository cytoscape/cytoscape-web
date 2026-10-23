import CloseIcon from '@mui/icons-material/Close'
import { Box, IconButton, Paper, Typography } from '@mui/material'
import { JSX, useRef, useState } from 'react'
import { DraggableCore, DraggableData } from 'react-draggable'

import { LayoutToolsPanel } from './LayoutToolsPanel'
import { useLayoutToolsPanelStore } from './store/layoutToolsPanelStore'

/** Class of the title bar, the only part of the panel that starts a drag */
const DRAG_HANDLE_CLASS = 'floating-layout-tools-drag-handle'

interface Offset {
  x: number
  y: number
}

interface DragStart {
  /** Pointer position at the press, relative to the network view */
  pointer: Offset
  /** The panel's offset at the press */
  offset: Offset
  /** The offsets that keep the panel inside the network view */
  min: Offset
  max: Offset
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/**
 * Offsets that keep `panel` inside the padding box of `view`, its offset
 * parent. `offsetLeft`/`offsetTop` ignore the transform, so they are the
 * panel's position at offset (0, 0).
 */
const dragLimits = (
  panel: HTMLElement,
  view: HTMLElement,
): { min: Offset; max: Offset } => ({
  min: { x: -panel.offsetLeft, y: -panel.offsetTop },
  max: {
    x: view.clientWidth - panel.offsetWidth - panel.offsetLeft,
    y: view.clientHeight - panel.offsetHeight - panel.offsetTop,
  },
})

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
 * The drag uses `DraggableCore`, not `Draggable`: `Draggable` adds each move
 * to its last committed position, and React 18 commits mouse-move updates in
 * a later task, so a move that arrives before the commit is lost and the
 * panel falls behind the pointer. Here every move is measured from the press.
 */
export const FloatingLayoutToolsPanel = (): JSX.Element | null => {
  const open = useLayoutToolsPanelStore((state) => state.open)
  const setOpen = useLayoutToolsPanelStore((state) => state.setOpen)

  // Unmounted while closed, so it reopens with no offset
  return open ? <MovablePanel onClose={() => setOpen(false)} /> : null
}

const MovablePanel = ({ onClose }: { onClose: () => void }): JSX.Element => {
  // react-draggable falls back to findDOMNode without a ref
  const nodeRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const dragStart = useRef<DragStart | null>(null)

  const handleStart = (_e: unknown, data: DraggableData): false | void => {
    const panel = nodeRef.current
    const view = panel?.offsetParent
    if (panel == null || !(view instanceof HTMLElement)) {
      return false
    }
    dragStart.current = {
      pointer: { x: data.x, y: data.y },
      offset,
      ...dragLimits(panel, view),
    }
  }

  const handleDrag = (_e: unknown, data: DraggableData): void => {
    const start = dragStart.current
    if (start === null) {
      return
    }
    setOffset({
      x: clamp(
        start.offset.x + data.x - start.pointer.x,
        start.min.x,
        start.max.x,
      ),
      y: clamp(
        start.offset.y + data.y - start.pointer.y,
        start.min.y,
        start.max.y,
      ),
    })
  }

  const handleStop = (): void => {
    dragStart.current = null
  }

  return (
    <DraggableCore
      nodeRef={nodeRef}
      handle={`.${DRAG_HANDLE_CLASS}`}
      cancel="button"
      onStart={handleStart}
      onDrag={handleDrag}
      onStop={handleStop}
    >
      <Paper
        ref={nodeRef}
        data-testid="floating-layout-tools-panel"
        elevation={4}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
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
    </DraggableCore>
  )
}
