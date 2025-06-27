import Button from '@mui/material/Button'
import { Box, Divider, Tooltip, MenuItem } from '@mui/material'
import { useRef, useState, useEffect } from 'react'
import { LayoutEngine } from '../../../models/LayoutModel/LayoutEngine'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { Network } from '../../../models/NetworkModel'
import { useLayoutStore } from '../../../store/LayoutStore'
import { LayoutOptionDialog } from './LayoutOptionDialog'
import { useUiStateStore } from '../../../store/UiStateStore'
import { PrimeReactProvider } from 'primereact/api'
import { OverlayPanel } from 'primereact/overlaypanel'
import { TieredMenu } from 'primereact/tieredmenu'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { isHCX } from '../../../features/HierarchyViewer/utils/hierarchy-util'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { useUndoStack } from '../../../task/UndoStack'
import { LayoutAlgorithm } from '../../../models'
import { useRendererFunctionStore } from '../../../store/RendererFunctionStore'

interface DropdownMenuProps {
  label: string
  children?: React.ReactNode
}

export const LayoutMenu = (props: DropdownMenuProps): JSX.Element => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const [layoutInfo, setLayoutInfo] = useState<string | undefined>(undefined)
  const [layoutCounter, setLayoutCounter] = useState<number>(0)

  const getRendererFunction = useRendererFunctionStore(
    (state) => state.getFunction,
  )

  const networks: Map<string, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const activeNetworkView: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const activeNetworkViewTabIndex =
    useUiStateStore((state) => state.ui?.networkViewUi?.activeTabIndex) ?? 0

  const targetNetworkId: IdType =
    activeNetworkView === '' ? currentNetworkId : activeNetworkView

  const setIsRunning = useLayoutStore((state) => state.setIsRunning)
  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  const getViewModel = useViewModelStore((state) => state.getViewModel)
  const networkView = getViewModel(targetNetworkId)
  const { postEdit } = useUndoStack()

  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  // Effect to handle fit after layout completion
  useEffect(() => {
    if (layoutCounter > 0) {
      const fitFunction = getRendererFunction('cyjs', 'fit')
      if (fitFunction !== undefined) {
        // Use double requestAnimationFrame to ensure DOM updates are complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fitFunction()
            console.log('Fit after layout function called for: cyjs')
          })
        })
      } else {
        console.warn('Fit function not available for renderer: cyjs')
      }
    }
  }, [layoutCounter, getRendererFunction])

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const target: Network = networks.get(targetNetworkId) ?? ({} as Network)

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const cellViewIsSelected = activeNetworkViewTabIndex === 1

  //disable all the layout menu items
  const allDisabled =
    (isHCX(summary) && // the current network is a hierarchy
      currentNetworkId === targetNetworkId && // the hierarchy network is the active view
      cellViewIsSelected) || // the cell view tab is selected
    targetNetworkId === '' // no network is selected

  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const menuRef = useRef(null)

  const handleClose = (): void => {
    setAnchorEl(null)
    const menuRefCurrent = menuRef.current as any
    menuRefCurrent.hide()
  }

  const handleOpenDialog = (open: boolean): void => {
    setAnchorEl(null)
    const menuRefCurrent = menuRef.current as any
    menuRefCurrent.hide()
    setOpenDialog(open)
  }

  const afterLayout = (positionMap: Map<IdType, [number, number]>): void => {
    const prevPositions = new Map<IdType, [number, number]>()

    Object.entries(networkView?.nodeViews ?? {}).forEach(
      ([nodeId, nodeView]) => {
        prevPositions.set(nodeId, [nodeView.x, nodeView.y])
      },
    )

    // Update node positions in the view model
    updateNodePositions(targetNetworkId, positionMap)

    postEdit(
      UndoCommandType.APPLY_LAYOUT,
      `Apply layout`,
      [targetNetworkId, prevPositions],
      [targetNetworkId, positionMap],
    )
    setIsRunning(false)

    // Trigger fit by incrementing counter
    setLayoutCounter((prev) => prev + 1)
    console.log('Finished layout')
  }

  const getMenuItems = (): any => {
    const layoutMenuItems: any[] = []

    layoutEngines.forEach((layoutEngine: LayoutEngine) => {
      const engineName: string = layoutEngine.name
      const names: string[] = Object.keys(layoutEngine.algorithms)

      names.forEach((name: string) => {
        const algorithm: LayoutAlgorithm = layoutEngine.algorithms[name]
        const menuItem = {
          key: `${engineName}-${name}`,
          label: algorithm.displayName,
          description: algorithm.description ?? name,
          type: algorithm.type, // Make sure to include the type for sorting
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
            setLayoutInfo(engine.algorithms[name].displayName)
            engine.apply(nodes, edges, afterLayout, engine.algorithms[name])
          },
        }

        layoutMenuItems.push(menuItem)
      })
    })

    // Group by type and then sort each group alphabetically
    const typeGroups: Record<string, any[]> = {}

    // Group items by their type
    layoutMenuItems.forEach((item) => {
      const type = item.type || 'OTHER'
      if (!typeGroups[type]) {
        typeGroups[type] = []
      }
      typeGroups[type].push(item)
    })

    // Sort each group alphabetically by label
    Object.keys(typeGroups).forEach((type) => {
      typeGroups[type].sort((a, b) => a.label.localeCompare(b.label))
    })

    // Sort the types (groups) alphabetically
    const sortedTypes = Object.keys(typeGroups).sort()

    // Create a new array with dividers between groups
    const sortedMenuItemsWithDividers: any[] = []
    sortedTypes.forEach((type, index) => {
      // Add group items
      sortedMenuItemsWithDividers.push(...typeGroups[type])

      // Add divider after each group (except the last one)
      if (index < sortedTypes.length - 1) {
        sortedMenuItemsWithDividers.push({
          key: `divider-${type}`,
          type: 'divider',
          isDivider: true, // Flag to identify dividers
        })
      }
    })

    // Use the new array with dividers in the return value
    return [
      ...(allDisabled
        ? [
            {
              label: '',
              template: (
                <Tooltip
                  arrow
                  placement="right"
                  title={
                    targetNetworkId === ''
                      ? 'Layouts are disabled since the network view is empty'
                      : 'Layouts cannot be applied to the current network view'
                  }
                >
                  <Box>
                    {sortedMenuItemsWithDividers.map((menuItem: any) => {
                      // Render divider
                      if (menuItem.isDivider) {
                        return <Divider key={menuItem.key} />
                      }
                      return (
                        <MenuItem key={menuItem.key} disabled={true}>
                          {menuItem.label}
                        </MenuItem>
                      )
                    })}
                  </Box>
                </Tooltip>
              ),
            },
          ]
        : sortedMenuItemsWithDividers.map((menuItem: any) => {
            // Render divider
            if (menuItem.isDivider) {
              return {
                label: '',
                template: <Divider key={menuItem.key} />,
              }
            }

            // Render normal menu item
            return {
              label: menuItem.label,
              template: (
                <Tooltip
                  arrow
                  placement="right"
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
                    style={{
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      lineHeight: '1.2',
                      padding: '8px 16px',
                    }}
                  >
                    {menuItem.label}
                  </MenuItem>
                </Tooltip>
              ),
            }
          })),
      {
        label: '',
        template: <Divider />,
      },
      {
        label: 'Settings...',
        template: (
          <MenuItem
            onClick={() => {
              handleClose()
              handleOpenDialog(true)
            }}
          >
            Settings...
          </MenuItem>
        ),
      },
    ]
  }

  return (
    <PrimeReactProvider>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={(e) => {
          if (menuRef.current === null) {
            return
          }
          const menuRefCurrent = menuRef.current as any
          menuRefCurrent.toggle(e)
        }}
      >
        {label}
      </Button>
      <OverlayPanel
        ref={menuRef}
        unstyled
        style={{ minWidth: '25em', maxWidth: '25em' }}
      >
        <TieredMenu model={getMenuItems()} style={{ width: '100%' }} />
      </OverlayPanel>
      <LayoutOptionDialog
        afterLayout={afterLayout}
        network={target}
        open={openDialog}
        setOpen={setOpenDialog}
        allDisabled={allDisabled}
      />
    </PrimeReactProvider>
  )
}
