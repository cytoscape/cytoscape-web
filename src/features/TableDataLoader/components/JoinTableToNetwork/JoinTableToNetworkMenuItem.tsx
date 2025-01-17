import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'
import { Dialog, MantineProvider, Modal } from '@mantine/core'
import { MenuItem } from '@mui/material'
import { ReactElement, useState, useEffect } from 'react'

import { BaseMenuProps } from '../../../../components/ToolBar/BaseMenuProps'
import { JoinTableToNetworkForm } from './JoinTableToNetworkForm'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import { useJoinTableToNetworkStore } from '../../store/joinTableToNetworkStore'

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
