import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import { Divider, MenuItem } from '@mui/material'
import { useState } from 'react'
import { LayoutEngine } from '../../../models/LayoutModel/LayoutEngine'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { Network } from '../../../models/NetworkModel'
import { useLayoutStore } from '../../../store/LayoutStore'
import { LayoutOptionDialog } from './LayoutOptionDialog'

interface DropdownMenuProps {
  label: string
  children?: React.ReactNode
}

export const LayoutMenu = (props: DropdownMenuProps): JSX.Element => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  const networks: Map<string, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  let isRunning: boolean = useLayoutStore((state) => state.isRunning)
  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const target: Network = networks.get(currentNetworkId) ?? ({} as Network)

  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleOpenDropdownMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  const handleOpenDialog = (open: boolean): void => {
    setAnchorEl(null)
    setOpenDialog(open)
  }

  const afterLayout = (positionMap: Map<IdType, [number, number]>): void => {
    // Update node positions in the view model
    updateNodePositions(currentNetworkId, positionMap)
    isRunning = false
    console.log('Finished layout', isRunning)
  }

  const getMenuItems = (): any => {
    const menuItems: any[] = []
    layoutEngines.forEach((layoutEngine: LayoutEngine) => {
      const engineName: string = layoutEngine.name
      const names: string[] = layoutEngine.algorithmNames
      names.forEach((name: string) => {
        const menuItem = {
          key: `${engineName}-${name}`,
          label: `${engineName}: ${name}`,
          onClick: () => {
            console.log('LayoutMenu: onClick: ', name)
            if (target === undefined) {
              return
            }
            const engine: LayoutEngine = layoutEngines.find(
              (engine) => engine.name === engineName,
            ) as LayoutEngine
            const { nodes, edges } = target
            isRunning = true
            engine.apply(nodes, edges, afterLayout, name)
          },
        }

        menuItems.push(menuItem)
      })
    })

    return menuItems.map((menuItem: any) => {
      return (
        <MenuItem
          key={menuItem.key}
          onClick={() => {
            handleClose()
            menuItem.onClick()
          }}
        >
          {menuItem.label}
        </MenuItem>
      )
    })
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
        <MenuItem>Apply default layout</MenuItem>
        <Divider />
        {getMenuItems()}
        <Divider />
        <MenuItem onClick={() => handleOpenDialog(true)}>Settings...</MenuItem>
      </Menu>
      <LayoutOptionDialog
        afterLayout={afterLayout}
        network={target}
        open={openDialog}
        setOpen={setOpenDialog}
      />
    </div>
  )
}
