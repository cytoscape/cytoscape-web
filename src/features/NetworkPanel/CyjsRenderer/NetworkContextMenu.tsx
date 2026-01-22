import { Menu, MenuItem, Tooltip } from '@mui/material'
import { ReactElement, useEffect } from 'react'

import { IdType } from '../../../models/IdType'
import { NetworkView } from '../../../models/ViewModel'

export interface ContextMenuState {
  open: boolean
  anchorPosition: { top: number; left: number } | null
  networkPosition: [number, number] | null
  clickedNodeId: IdType | null
  clickedEdgeId: IdType | null
}

interface NetworkContextMenuProps {
  contextMenu: ContextMenuState
  networkView: NetworkView | undefined
  onClose: () => void
  onCreateNode: (position: [number, number]) => void
  onCreateEdgeFromNode: (sourceNodeId: IdType) => void
}

/**
 * Context menu for network canvas interactions
 * Shows different options based on what was right-clicked:
 * - Empty space: "Create Node"
 * - Node: "Create Edge from this Node"
 * - Edge: (future: "Delete Edge", "Edit Properties")
 */
export const NetworkContextMenu = ({
  contextMenu,
  networkView,
  onClose,
  onCreateNode,
  onCreateEdgeFromNode,
}: NetworkContextMenuProps): ReactElement => {
  // Check if current view supports creation
  const canCreateInView = (): boolean => {
    if (networkView === undefined) {
      return true // Default view supports creation
    }
    const viewType = networkView.type
    // Only allow creation in node-link diagrams
    return viewType === undefined || viewType === 'nodeLink'
  }

  const isCreationEnabled = canCreateInView()

  const handleCreateNode = (event?: React.MouseEvent): void => {
    console.log('[NetworkContextMenu] handleCreateNode called', {
      hasPosition: !!contextMenu.networkPosition,
      position: contextMenu.networkPosition,
      eventTarget: event?.target,
    })
    
    if (event) {
      console.log('[NetworkContextMenu] handleCreateNode: Stopping propagation')
      event.stopPropagation()
      event.preventDefault()
    }
    
    if (contextMenu.networkPosition) {
      console.log('[NetworkContextMenu] handleCreateNode: Calling onCreateNode')
      onCreateNode(contextMenu.networkPosition)
    } else {
      console.warn('[NetworkContextMenu] handleCreateNode: No network position available')
    }
    console.log('[NetworkContextMenu] handleCreateNode: Calling onClose')
    onClose()
  }

  const handleCreateEdgeFromNode = (event?: React.MouseEvent): void => {
    console.log('[NetworkContextMenu] handleCreateEdgeFromNode called', {
      clickedNodeId: contextMenu.clickedNodeId,
      eventTarget: event?.target,
    })
    
    if (event) {
      console.log('[NetworkContextMenu] handleCreateEdgeFromNode: Stopping propagation')
      event.stopPropagation()
      event.preventDefault()
    }
    
    if (contextMenu.clickedNodeId) {
      console.log('[NetworkContextMenu] handleCreateEdgeFromNode: Calling onCreateEdgeFromNode with', contextMenu.clickedNodeId)
      onCreateEdgeFromNode(contextMenu.clickedNodeId)
    } else {
      console.warn('[NetworkContextMenu] handleCreateEdgeFromNode: No clickedNodeId available')
    }
    console.log('[NetworkContextMenu] handleCreateEdgeFromNode: Calling onClose')
    onClose()
  }

  // Determine what was clicked
  const clickedOnNode = contextMenu.clickedNodeId !== null
  const clickedOnEdge = contextMenu.clickedEdgeId !== null
  const clickedOnCanvas = !clickedOnNode && !clickedOnEdge

  // Log when menu state changes
  useEffect(() => {
    console.log('[NetworkContextMenu] Menu state changed', {
      open: contextMenu.open,
      clickedOnNode,
      clickedOnEdge,
      clickedOnCanvas,
      clickedNodeId: contextMenu.clickedNodeId,
      clickedEdgeId: contextMenu.clickedEdgeId,
      anchorPosition: contextMenu.anchorPosition,
    })
  }, [contextMenu.open, clickedOnNode, clickedOnEdge, clickedOnCanvas, contextMenu.clickedNodeId, contextMenu.clickedEdgeId, contextMenu.anchorPosition])

  console.log('[NetworkContextMenu] Rendering menu', {
    open: contextMenu.open,
    clickedOnNode,
    clickedOnEdge,
    clickedOnCanvas,
    isCreationEnabled,
  })

  return (
    <Menu
      open={contextMenu.open}
      onClose={(event, reason) => {
        console.log('[NetworkContextMenu] Menu onClose called', { reason, event })
        // Type guard: check if event has stopPropagation method
        if (event && typeof (event as any).stopPropagation === 'function') {
          (event as any).stopPropagation()
        }
        onClose()
      }}
      onClick={(e) => {
        console.log('[NetworkContextMenu] Menu onClick fired', {
          target: e.target,
          currentTarget: e.currentTarget,
        })
        e.stopPropagation()
      }}
      anchorReference="anchorPosition"
      anchorPosition={
        contextMenu.anchorPosition
          ? {
              top: contextMenu.anchorPosition.top,
              left: contextMenu.anchorPosition.left,
            }
          : undefined
      }
      MenuListProps={{
        'aria-labelledby': 'network-context-menu',
        onClick: (e) => {
          console.log('[NetworkContextMenu] MenuList onClick fired', {
            target: e.target,
            currentTarget: e.currentTarget,
          })
          e.stopPropagation()
        },
      }}
    >
      {/* Empty canvas: Show "Create Node" */}
      {clickedOnCanvas && (
        <Tooltip
          title={
            !isCreationEnabled
              ? 'Creation not available in circle packing view. Switch to node-link view to create elements.'
              : ''
          }
          placement="left"
        >
          <span>
            <MenuItem 
              onClick={(e) => {
                console.log('[NetworkContextMenu] Create Node MenuItem onClick fired', {
                  target: e.target,
                  currentTarget: e.currentTarget,
                })
                handleCreateNode(e)
              }} 
              disabled={!isCreationEnabled}
            >
              Create Node
            </MenuItem>
          </span>
        </Tooltip>
      )}

      {/* Node clicked: Show "Create Edge from this Node" */}
      {clickedOnNode && (
        <Tooltip
          title={
            !isCreationEnabled
              ? 'Creation not available in circle packing view. Switch to node-link view to create elements.'
              : ''
          }
          placement="left"
        >
          <span>
            <MenuItem
              onClick={(e) => {
                console.log('[NetworkContextMenu] Create Edge MenuItem onClick fired', {
                  target: e.target,
                  currentTarget: e.currentTarget,
                })
                handleCreateEdgeFromNode(e)
              }}
              disabled={!isCreationEnabled}
            >
              Create Edge from this Node
            </MenuItem>
          </span>
        </Tooltip>
      )}

      {/* Edge clicked: Future options (Delete, Edit Properties) */}
      {clickedOnEdge && <MenuItem disabled>Edit Edge (Coming soon)</MenuItem>}
    </Menu>
  )
}
