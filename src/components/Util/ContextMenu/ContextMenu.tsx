import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { ContextMenuItem } from './ContextMenuItem'

interface ContextMenuProps {
  open: boolean
  mouseX: number
  mouseY: number
  items: ContextMenuItem[]
  onClose: () => void
}

const ContextMenu = ({
  open,
  mouseX,
  mouseY,
  items,
  onClose,
}: ContextMenuProps): JSX.Element => {
  const handleItemClick = (action: () => void) => {
    onClose()
    action()
  }

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={open ? { top: mouseY, left: mouseX } : undefined}
    >
      {items.length > 0 ? (
        items.map((item, index) => (
          <MenuItem
            key={index}
            onClick={() => handleItemClick(item.action)}
            disabled={item.disabled ?? false}
          >
            {item.label}
          </MenuItem>
        ))
      ) : (
        <MenuItem disabled>No actions available</MenuItem>
      )}
    </Menu>
  )
}

export default ContextMenu
