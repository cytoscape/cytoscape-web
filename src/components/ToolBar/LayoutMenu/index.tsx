import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import { Divider, MenuItem, Tooltip } from '@mui/material'
import { useState } from 'react'
import { LayoutEngine } from '../../../models/LayoutModel/LayoutEngine'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { Network } from '../../../models/NetworkModel'
import { useLayoutStore } from '../../../store/LayoutStore'
import { LayoutOptionDialog } from './LayoutOptionDialog'
import { useUiStateStore } from '../../../store/UiStateStore'

interface DropdownMenuProps {
  label: string
  children?: React.ReactNode
}

export const LayoutMenu = (props: DropdownMenuProps): JSX.Element => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  const networks: Map<string, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const activeNetworkView: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const targetNetworkId: IdType =
    activeNetworkView === '' ? currentNetworkId : activeNetworkView

  const setIsRunning = useLayoutStore((state) => state.setIsRunning)
  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const target: Network = networks.get(targetNetworkId) ?? ({} as Network)

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
    updateNodePositions(targetNetworkId, positionMap)
    setIsRunning(false)
    console.log('Finished layout')
  }

  const getMenuItems = (): any => {
    const menuItems: any[] = []
    layoutEngines.forEach((layoutEngine: LayoutEngine) => {
      const engineName: string = layoutEngine.name
      const names: string[] = Object.keys(layoutEngine.algorithms)
      names.forEach((name: string) => {
        const algorithm = layoutEngine.algorithms[name]
        const menuItem = {
          key: `${engineName}-${name}`,
          label: `${engineName}: ${name}`,
          description: algorithm.description ?? name,
          disabled:
            algorithm.threshold === undefined
              ? false
              : target.nodes?.length + target.edges?.length >
                algorithm.threshold,
          onClick: () => {
            if (target === undefined) {
              return
            }
            const engine: LayoutEngine = layoutEngines.find(
              (engine) => engine.name === engineName,
            ) as LayoutEngine
            const { nodes, edges } = target
            setIsRunning(true)
            engine.apply(nodes, edges, afterLayout, engine.algorithms[name])
          },
        }

        menuItems.push(menuItem)
      })
    })

    return menuItems.map((menuItem: any) => {
      return (
        <Tooltip
          arrow
          placement={'right'}
          title={menuItem.description}
          key={menuItem.key}
        >
          <MenuItem
            key={menuItem.key}
            disabled={menuItem.disabled}
            onClick={() => {
              handleClose()
              menuItem.onClick()
            }}
          >
            {menuItem.label}
          </MenuItem>
        </Tooltip>
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
