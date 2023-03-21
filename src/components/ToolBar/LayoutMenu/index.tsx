import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import { Divider, MenuItem } from '@mui/material'
import { useState } from 'react'
import { LayoutManager } from '../../../utils/LayoutEngine/impl/LayoutManager'
import { LayoutEngine } from '../../../utils/LayoutEngine/LayoutEngine'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { Network } from '../../../models/NetworkModel'

interface DropdownMenuProps {
  label: string
  children?: React.ReactNode
}

export const LayoutMenu = (props: DropdownMenuProps): JSX.Element => {
  const networks: Map<string, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  const target: Network | undefined = networks.get(currentNetworkId)

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

  const afterLayout = (positionMap: Map<IdType, [number, number]>): void => {
    // Update node positions in the view model
    updateNodePositions(currentNetworkId, positionMap)
  }

  const getMenuItems = (): any => {
    const menuItems: any[] = []
    LayoutManager.layoutEngines.forEach((layoutEngine: LayoutEngine) => {
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
            const engine: LayoutEngine =
              LayoutManager.getLayoutEngine(engineName)
            const { nodes, edges } = target
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
        {getMenuItems()}
        <Divider />
      </Menu>
    </div>
  )
}
