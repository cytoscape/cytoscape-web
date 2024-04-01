import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'
import { MenuItem, Dialog } from '@mui/material'
import { ReactElement, useState, useEffect } from 'react'

import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps'
import { TableDataLoader } from './TableDataLoader'
import { useDisclosure } from '@mantine/hooks'

export const CreateNetworkFromTableFileMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const [showDialog, setShowDialog] = useState(false)

  const content = (
    <Dialog
      maxWidth="lg"
      fullWidth={true}
      open={showDialog}
      onClose={props.handleClose}
    >
      <TableDataLoader {...props} />
    </Dialog>
  )

  return (
    <>
      <MenuItem onClick={() => setShowDialog(true)}>
        Upload network from table file
      </MenuItem>
      {content}
    </>
  )
}
