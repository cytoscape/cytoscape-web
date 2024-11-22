import React from 'react'
import { Checkbox, FormControlLabel } from '@mui/material'
import { IdType } from '../../../models/IdType'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'

export const LockSizeCheckbox = (props: { currentNetworkId: IdType }) => {
  const { currentNetworkId } = props
  const nodeSizeLocked = useUiStateStore(
    (state) =>
      state.ui.visualStyleOptions[currentNetworkId]?.visualEditorProperties
        ?.nodeSizeLocked,
  )
  const setNetworkModified: (id: IdType, isModified: boolean) => void =
    useWorkspaceStore((state) => state.setNetworkModified)

  const setNodeSizeLockedState = useUiStateStore(
    (state) => state.setNodeSizeLockedState,
  )
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = event.target.checked
    setNodeSizeLockedState(currentNetworkId, newStatus)
    setNetworkModified(currentNetworkId, true)
  }

  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={nodeSizeLocked}
          onChange={handleChange}
          color="primary"
        />
      }
      label="Lock node width and height"
    />
  )
}

export const LockColorCheckbox = (props: { currentNetworkId: IdType }) => {
  const { currentNetworkId } = props
  const arrowColorMatchesEdge = useUiStateStore(
    (state) =>
      state.ui.visualStyleOptions[currentNetworkId]?.visualEditorProperties
        .arrowColorMatchesEdge,
  )
  const setNetworkModified: (id: IdType, isModified: boolean) => void =
    useWorkspaceStore((state) => state.setNetworkModified)

  const setArrowColorMatchesEdgeState = useUiStateStore(
    (state) => state.setArrowColorMatchesEdgeState,
  )
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = event.target.checked
    setArrowColorMatchesEdgeState(currentNetworkId, newStatus)
    setNetworkModified(currentNetworkId, true)
  }

  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={arrowColorMatchesEdge}
          onChange={handleChange}
          color="primary"
        />
      }
      label="Edge color to arrows"
    />
  )
}
