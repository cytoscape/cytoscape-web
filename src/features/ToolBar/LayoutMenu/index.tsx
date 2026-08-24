import BuildIcon from '@mui/icons-material/Build'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SettingsIcon from '@mui/icons-material/Settings'
import { useCallback, useEffect, useState } from 'react'

import { useLayoutStore } from '../../../data/hooks/stores/LayoutStore'
import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererFunctionStore } from '../../../data/hooks/stores/RendererFunctionStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '../../../data/hooks/useUndoStack'
import { logUi } from '../../../debug'
import { LayoutAlgorithm } from '../../../models'
import { IdType } from '../../../models/IdType'
import { LayoutEngine } from '../../../models/LayoutModel/LayoutEngine'
import { Network } from '../../../models/NetworkModel'
import { DEFAULT_RENDERER_ID } from '../../../models/RendererModel/impl/defaultRenderer'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { RootMenu } from '../../../models/AppModel/RootMenu'
import { useLayoutToolsPanelStore } from '../../LayoutTools/store/layoutToolsPanelStore'
import { isHCX } from '../../HierarchyViewer/utils/hierarchyUtil'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenu, DropdownMenuItem } from '../DropdownMenu'
import { ToolbarMenuItem } from '../menuItemModel'
import { applyDefaultLayout } from './applyDefaultLayout'
import { LayoutOptionDialog } from './LayoutOptionDialog'

/**
 * One algorithm while the menu is being assembled and sorted. Deliberately
 * separate from ToolbarMenuItem: these fields — the grouping type, the engine
 * callback — exist only inside this module and are translated into
 * ToolbarMenuItem templates at the end.
 */
interface LayoutAlgorithmEntry {
  key: string
  label: string
  description: string
  /** Algorithm type, used to group and order the list. */
  type: string
  disabled: boolean
  onClick: () => void
  isDivider?: false
}

/** A boundary between two algorithm groups in the sorted list. */
interface LayoutGroupDivider {
  key: string
  type: string
  isDivider: true
}

type LayoutMenuEntry = LayoutAlgorithmEntry | LayoutGroupDivider

export const LayoutMenu = (): JSX.Element => {
  const [open, setOpen] = useState(false)
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  // Counter to trigger fit function after layout is applied
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
  const hasNoNetworks =
    useWorkspaceStore((state) => state.workspace.networkIds).length === 0

  const activeNetworkViewTabIndex =
    useUiStateStore((state) => state.ui?.networkViewUi?.activeTabIndex) ?? 0

  const targetNetworkId: IdType =
    activeNetworkView === '' ? currentNetworkId : activeNetworkView

  const setIsRunning = useLayoutStore((state) => state.setIsRunning)
  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )
  const preferredLayout: LayoutAlgorithm = useLayoutStore(
    (state) => state.preferredLayout,
  )
  const toggleLayoutTools = useLayoutToolsPanelStore((state) => state.toggle)

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
      // TODO: add support for multiple renderers
      const fitFunction = getRendererFunction(DEFAULT_RENDERER_ID, 'fit')
      if (fitFunction !== undefined) {
        fitFunction()
      } else {
        logUi.warn(
          `[${LayoutMenu.name}]: Fit function not available for renderer: cyjs`,
        )
      }
    }
  }, [layoutCounter, getRendererFunction])

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

  const handleClose = (): void => {
    setOpen(false)
  }

  const onBeforeRun = useCallback((): void => {
    setOpen(false)
  }, [])

  // Service apps whose cyWebMenuItem.root resolves to the Layout menu.
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Layout,
    onBeforeRun,
  )

  const handleOpenDialog = (open: boolean): void => {
    setOpen(false)
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

    // Trigger fit() by incrementing counter
    // This is because fit function should be called separately after layout is applied
    // to support viewport recording.
    setLayoutCounter((prev) => prev + 1)
  }

  const getMenuItems = (): ToolbarMenuItem[] => {
    const layoutMenuItems: LayoutAlgorithmEntry[] = []

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
            engine.apply(nodes, edges, afterLayout, engine.algorithms[name])
          },
        }

        layoutMenuItems.push(menuItem)
      })
    })

    // Group by type and then sort each group alphabetically
    const typeGroups: Record<string, LayoutAlgorithmEntry[]> = {}

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
    const sortedMenuItemsWithDividers: LayoutMenuEntry[] = []
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
      {
        template: (
          <DropdownMenuItem
            label="Apply Default Layout"
            icon={<PlayArrowIcon />}
            tooltip={
              allDisabled
                ? targetNetworkId === ''
                  ? 'Layouts are disabled since the network view is empty'
                  : 'Layouts cannot be applied to the current network view'
                : `Apply default layout - ${preferredLayout.displayName}`
            }
            disabled={allDisabled}
            onClick={() => {
              handleClose()
              applyDefaultLayout({
                layoutEngines,
                preferredLayout,
                network: target,
                afterLayout,
                setIsRunning,
              })
            }}
          />
        ),
      },
      {
        separator: true,
      },
      ...(allDisabled
        ? sortedMenuItemsWithDividers.map((menuItem) => {
            // Render divider
            if (menuItem.isDivider) {
              return {
                separator: true,
              }
            }
            return {
              template: (
                <DropdownMenuItem
                  key={menuItem.key}
                  label={menuItem.label}
                  tooltip={
                    targetNetworkId === ''
                      ? 'Layouts are disabled since the network view is empty'
                      : 'Layouts cannot be applied to the current network view'
                  }
                  disabled={true}
                />
              ),
            }
          })
        : sortedMenuItemsWithDividers.map((menuItem) => {
            // Render divider
            if (menuItem.isDivider) {
              return {
                separator: true,
              }
            }
            // Render normal menu item
            return {
              template: (
                <DropdownMenuItem
                  key={menuItem.key}
                  label={menuItem.label}
                  tooltip={menuItem.description}
                  disabled={menuItem.disabled}
                  onClick={() => {
                    handleClose()
                    menuItem.onClick()
                  }}
                />
              ),
            }
          })),
      {
        separator: true,
      },
      {
        template: (
          <DropdownMenuItem
            label="Layout Tools"
            icon={<BuildIcon />}
            tooltip="Show the layout tools panel in the lower-left corner"
            onClick={() => {
              handleClose()
              toggleLayoutTools()
            }}
          />
        ),
      },
      {
        template: (
          <DropdownMenuItem
            label="Settings..."
            icon={<SettingsIcon />}
            onClick={() => {
              handleClose()
              handleOpenDialog(true)
            }}
          />
        ),
      },
    ]
  }

  return (
    <>
      <DropdownMenu
        id="layout-menu"
        label="Layout"
        menuItems={[
          ...getMenuItems(),
          ...(serviceMenuItems.length > 0
            ? [{ separator: true }, ...serviceMenuItems]
            : []),
        ]}
        open={open}
        disabled={hasNoNetworks}
        disabledTooltip="Load or create a network first"
        onOpenChange={setOpen}
      />
      <LayoutOptionDialog
        afterLayout={afterLayout}
        network={target}
        open={openDialog}
        setOpen={setOpenDialog}
        allDisabled={allDisabled}
      />
      {dialogs}
    </>
  )
}
