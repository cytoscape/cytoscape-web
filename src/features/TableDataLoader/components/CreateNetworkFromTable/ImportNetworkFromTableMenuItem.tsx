import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'
import { MenuItem, Dialog } from '@mui/material'
import { ReactElement, useState, useEffect } from 'react'

import { BaseMenuProps } from '../../../../components/ToolBar/BaseMenuProps'
import { CreateNetworkFromTableForm } from './CreateNetworkFromTableForm'
import { MantineProvider, Modal, Title } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { RemoveScroll } from '@mantine/core'
import {
  CreateNetworkFromTableStep,
  useCreateNetworkFromTableStore,
} from '../../store/createNetworkFromTableStore'

export const CreateNetworkFromTableFileMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const [showDialog, setShowDialog] = useState(false)

  const step = useCreateNetworkFromTableStore((state) => state.step)
  const title =
    step === CreateNetworkFromTableStep.FileUpload
      ? 'Upload Tabular Data File'
      : 'Edit Column Definitions'

  const content = (
    <MantineProvider>
      <ModalsProvider>
        <div>
          <Modal
            title={
              <Title c="gray" order={4}>
                {title}
              </Title>
            }
            size="auto"
            withinPortal={false}
            opened={showDialog}
            onClose={props.handleClose}
          >
            <CreateNetworkFromTableForm {...props} />
          </Modal>
        </div>
      </ModalsProvider>
    </MantineProvider>
  )

  return (
    <div>
      <MenuItem onClick={() => setShowDialog(true)}>
        Upload network from table file
      </MenuItem>
      {content}
    </div>
  )
}
