import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'

import { Dialog, MantineProvider, Modal } from '@mantine/core'
import { MenuItem } from '@mui/material'
import { ReactElement, useEffect,useState } from 'react'

import { useWorkspaceStore } from '../../../../hooks/stores/WorkspaceStore'
import { BaseMenuProps } from '../../../ToolBar/BaseMenuProps'
import { useJoinTableToNetworkStore } from '../../store/joinTableToNetworkStore'
import { JoinTableToNetworkForm } from './JoinTableToNetworkForm'

export const JoinTableToNetworkMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)
  const setShow = useJoinTableToNetworkStore((state) => state.setShow)

  const disabled = networkIds.length === 0

  return (
    <>
      <MenuItem
        disabled={disabled}
        onClick={() => {
          props.handleClose()
          setShow(true)
        }}
      >
        Table from File...
      </MenuItem>
    </>
  )
}
