import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import { Divider } from '@mui/material'
import { RemoveAllNetworksMenuItem } from './RemoveAllNetworksMenuItem'
import { RemoveNetworkMenuItem } from './RemoveNetworkMenuItem'
import { LoadDemoNetworksMenuItem } from './LoadDemoNetworksMenuItem'
import { LoadFromNdexMenuItem } from './LoadFromNdexMenuItem'
import { useState } from 'react'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { exportNetworkToCx2 } from '../../../store/exportCX'
import { Network } from '../../../models/NetworkModel'
interface DropdownMenuProps {
  label: string
  children?: React.ReactNode
}

export const DataMenu: React.FC<DropdownMenuProps> = (
  props: DropdownMenuProps,
) => {
  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const handleOpenDropdownMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  // const tables = useTableStore((state) => state.tables)
  const table = useTableStore((state) => state.tables[currentNetworkId])

  const viewModels = useViewModelStore((state) => state.viewModels)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)
  const networks = useNetworkStore((state) => state.networks)

  const handleClick = (): void => {
    // const table = useTableStore((state) => state.tables[currentNetworkId])
    const viewModel = viewModels[currentNetworkId]
    const visualStyle = visualStyles[currentNetworkId]
    const network = networks.get(currentNetworkId) as Network

    console.log(
      exportNetworkToCx2(
        network,
        visualStyle,
        table.nodeTable,
        table.edgeTable,
        viewModel,
      ),
    )
  }

  return (
    <div>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleOpenDropdownMenu}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': label,
        }}
      >
        <LoadFromNdexMenuItem handleClose={handleClose} />
        <LoadDemoNetworksMenuItem handleClose={handleClose} />
        <Divider />
        <RemoveNetworkMenuItem handleClose={handleClose} />
        <RemoveAllNetworksMenuItem handleClose={handleClose} />
        <Divider />
        <Button onClick={handleClick}>Export to NDEx</Button>
      </Menu>
    </div>
  )
}
