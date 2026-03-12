import { Menu, MenuItem, Tooltip } from '@mui/material'
import { ReactElement, useEffect } from 'react'

import { useContextMenuItemStore } from '../../../data/hooks/stores/ContextMenuItemStore'
import { logUi } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { ContextMenuTarget } from '../../../models/StoreModel/ContextMenuItemStoreModel'
import { NetworkView } from '../../../models/ViewModel'

export interface ContextMenuState {
  open: boolean
  anchorPosition: { top: number; left: number } | null
  networkPosition: [number, number] | null
  clickedNodeId: IdType | null
  clickedEdgeId: IdType | null
  networkId: IdType
}

interface NetworkContextMenuProps {
  contextMenu: ContextMenuState
  networkView: NetworkView | undefined
  onClose: () => void
  onCreateNode: (position: [number, number]) => void
  onCreateEdgeFromNode: (sourceNodeId: IdType) => void
  isHierarchy?: boolean
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
  isHierarchy = false,
}: NetworkContextMenuProps): ReactElement => {
  // Read app-registered items from store
  const registeredItems = useContextMenuItemStore((state) => state.items)

  // Determine current target type
  const target: ContextMenuTarget =
    contextMenu.clickedNodeId !== null
      ? 'node'
      : contextMenu.clickedEdgeId !== null
        ? 'edge'
        : 'canvas'

  // Filter items matching the current target
  const appItems = registeredItems.filter((item) =>
    (item.targetTypes ?? ['node', 'edge']).includes(target),
  )

  // Check if current view supports creation
  const canCreateInView = (): boolean => {
    if (networkView === undefined) {
      return true // Default view supports creation
    }
    const viewType = networkView.type
    // Only allow creation in node-link diagrams
    return viewType === undefined || viewType === 'nodeLink'
  }

  const isCreationEnabled = canCreateInView() && !isHierarchy

  const handleCreateNode = (event?: React.MouseEvent): void => {
    logUi.info('[NetworkContextMenu] handleCreateNode called', {
      hasPosition: !!contextMenu.networkPosition,
      position: contextMenu.networkPosition,
      eventTarget: event?.target,
    })
    
    if (event) {
      logUi.info('[NetworkContextMenu] handleCreateNode: Stopping propagation')
      event.stopPropagation()
      event.preventDefault()
    }
    
    if (contextMenu.networkPosition) {
      logUi.info('[NetworkContextMenu] handleCreateNode: Calling onCreateNode')
      onCreateNode(contextMenu.networkPosition)
    } else {
      logUi.warn('[NetworkContextMenu] handleCreateNode: No network position available')
    }
    logUi.info('[NetworkContextMenu] handleCreateNode: Calling onClose')
    onClose()
  }

  const handleCreateEdgeFromNode = (event?: React.MouseEvent): void => {
    logUi.info('[NetworkContextMenu] handleCreateEdgeFromNode called', {
      clickedNodeId: contextMenu.clickedNodeId,
      eventTarget: event?.target,
    })
    
    if (event) {
      logUi.info('[NetworkContextMenu] handleCreateEdgeFromNode: Stopping propagation')
      event.stopPropagation()
      event.preventDefault()
    }
    
    if (contextMenu.clickedNodeId) {
      logUi.info('[NetworkContextMenu] handleCreateEdgeFromNode: Calling onCreateEdgeFromNode with', contextMenu.clickedNodeId)
      onCreateEdgeFromNode(contextMenu.clickedNodeId)
    } else {
      logUi.warn('[NetworkContextMenu] handleCreateEdgeFromNode: No clickedNodeId available')
    }
    logUi.info('[NetworkContextMenu] handleCreateEdgeFromNode: Calling onClose')
    onClose()
  }

  // Determine what was clicked
  const clickedOnNode = contextMenu.clickedNodeId !== null
  const clickedOnEdge = contextMenu.clickedEdgeId !== null
  const clickedOnCanvas = !clickedOnNode && !clickedOnEdge

  // Log when menu state changes
  useEffect(() => {
    logUi.info('[NetworkContextMenu] Menu state changed', {
      open: contextMenu.open,
      clickedOnNode,
      clickedOnEdge,
      clickedOnCanvas,
      clickedNodeId: contextMenu.clickedNodeId,
      clickedEdgeId: contextMenu.clickedEdgeId,
      anchorPosition: contextMenu.anchorPosition,
    })
  }, [contextMenu.open, clickedOnNode, clickedOnEdge, clickedOnCanvas, contextMenu.clickedNodeId, contextMenu.clickedEdgeId, contextMenu.anchorPosition])

  logUi.info('[NetworkContextMenu] Rendering menu', {
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
        logUi.info('[NetworkContextMenu] Menu onClose called', { reason, event })
        // Type guard: check if event has stopPropagation method
        if (event && typeof (event as any).stopPropagation === 'function') {
          (event as any).stopPropagation()
        }
        onClose()
      }}
      onClick={(e) => {
        logUi.info('[NetworkContextMenu] Menu onClick fired', {
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
          logUi.info('[NetworkContextMenu] MenuList onClick fired', {
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
            isHierarchy
              ? 'Creation not available for hierarchy networks'
              : !isCreationEnabled
                ? 'Creation not available in circle packing view. Switch to node-link view to create elements.'
                : ''
          }
          placement="left"
        >
          <span>
            <MenuItem 
              onClick={(e) => {
                logUi.info('[NetworkContextMenu] Create Node MenuItem onClick fired', {
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
            isHierarchy
              ? 'Creation not available for hierarchy networks'
              : !isCreationEnabled
                ? 'Creation not available in circle packing view. Switch to node-link view to create elements.'
                : ''
          }
          placement="left"
        >
          <span>
            <MenuItem
              onClick={(e) => {
                logUi.info('[NetworkContextMenu] Create Edge MenuItem onClick fired', {
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

      {/* App-registered context menu items */}
      {appItems.map((item) => (
        <MenuItem
          key={item.itemId}
          onClick={() => {
            item.handler({
              type: target,
              id:
                contextMenu.clickedNodeId ??
                contextMenu.clickedEdgeId ??
                undefined,
              networkId: contextMenu.networkId,
            })
            onClose()
          }}
        >
          {item.label}
        </MenuItem>
      ))}
    </Menu>
  )
}
