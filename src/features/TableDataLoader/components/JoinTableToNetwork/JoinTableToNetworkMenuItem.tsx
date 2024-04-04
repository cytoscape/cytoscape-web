import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'
import { MenuItem, Dialog } from '@mui/material'
import { ReactElement, useState, useEffect } from 'react'

import { BaseMenuProps } from '../../../../components/ToolBar/BaseMenuProps'
import { JoinTableToNetworkForm } from './JoinTableToNetworkForm'

export const JoinTableToNetworkMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const [showDialog, setShowDialog] = useState(false)

  const content = (
    <Dialog
      maxWidth="xl"
      fullWidth={true}
      open={showDialog}
      onClose={props.handleClose}
    >
      <JoinTableToNetworkForm {...props} />
    </Dialog>
  )

  return (
    <>
      <MenuItem onClick={() => setShowDialog(true)}>
        Join table to network
      </MenuItem>
      {content}
    </>
  )
}
