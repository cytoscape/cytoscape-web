import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useTableStore } from '../../../store/TableStore'
import { Edge } from '../../../models'

export const AddNodesAndEdgesMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const [disabled, setDisabled] = useState<boolean>(true)
  const deleteSelectedNodes = useNetworkStore((state) => state.deleteNodes)

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const viewModel = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )

  const activeNetworkView: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  const activeNetworkViewTabIndex =
    useUiStateStore((state) => state.ui?.networkViewUi?.activeTabIndex) ?? 0
  const targetNetworkId: IdType =
    activeNetworkView === '' ? currentNetworkId : activeNetworkView

  const networkView = useViewModelStore((state) =>
    state.getViewModel(targetNetworkId),
  )

  const selectedNodes: IdType[] =
    networkView !== undefined ? networkView.selectedNodes : []

  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  )

  const addNodeView = useViewModelStore((state) => state.addNodeView)
  const addEdgeView = useViewModelStore((state) => state.addEdgeView)
  const addNodesAndEdges = useNetworkStore((state) => state.addNodesAndEdges)

  const editRows = useTableStore((state) => state.editRows)
  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  const handleDeleteNodes = (): void => {
    // TODO: ask user to confirm deletion
    const nodeId = selectedNodes[0] ?? '1'
    const edges: Edge[] = [{ id: 'e999', s: '9999', t: nodeId }]
    const nodeView = {
      id: '9999',
      values: new Map(),
      x: 500,
      y: 500,
    }

    const edgeView = {
      id: 'e999',
      source: '9999',
      target: nodeId,
      values: new Map(),
    }

    addNodesAndEdges(targetNetworkId, ['9999'], edges)
    updateNodePositions(targetNetworkId, new Map([['9999', [500, 500]]]))
    addNodeView(targetNetworkId, nodeView)
    addEdgeView(targetNetworkId, edgeView)

    props.handleClose()
  }

  return <MenuItem onClick={handleDeleteNodes}>add node to selected</MenuItem>
}
