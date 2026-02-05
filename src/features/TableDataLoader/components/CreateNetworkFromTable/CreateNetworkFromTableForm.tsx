import {
  ActionIcon,
  Group,
  MantineProvider,
  Modal,
  Paper,
  Title,
  Tooltip,
} from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { IconWindowMaximize,IconWindowMinimize } from '@tabler/icons-react'
import { PrimeReactProvider } from 'primereact/api'
import { useState } from 'react'

import { BaseMenuProps } from '../../../ToolBar/BaseMenuProps'
import {
  CreateNetworkFromTableStep,
  useCreateNetworkFromTableStore,
} from '../../store/createNetworkFromTableStore'
import { TableColumnAssignmentForm } from './TableColumnAssignmentForm'

export function CreateNetworkFromTableForm(props: BaseMenuProps) {
  const step = useCreateNetworkFromTableStore((state) => state.step)
  const show = useCreateNetworkFromTableStore((state) => state.show)
  const [fullScreen, setFullScreen] = useState(false)

  const title =
    step === CreateNetworkFromTableStep.FileUpload
      ? 'Upload Tabular Data File'
      : 'Edit Column Definitions'

  const stepContentMap = {
    [CreateNetworkFromTableStep.FileUpload]: <div></div>,
    [CreateNetworkFromTableStep.ColumnAssignmentForm]: (
      <TableColumnAssignmentForm {...props} />
    ),
  }

  const content = stepContentMap[step]

  return (
    <PrimeReactProvider>
      <MantineProvider>
        <ModalsProvider>
          <div>
            <Modal
              data-testid="create-network-from-table-modal"
              zIndex={2000}
              centered
              fullScreen={fullScreen}
              title={
                <Group justify="space-between">
                  <Title c="gray" order={4}>
                    {title}
                  </Title>
                  {fullScreen ? (
                    <Tooltip
                      zIndex={2000}
                      position="bottom"
                      label="Exit Fullscreen"
                    >
                      <ActionIcon
                        data-testid="create-network-from-table-exit-fullscreen-button"
                        variant="default"
                        onClick={() => setFullScreen(false)}
                      >
                        <IconWindowMinimize />
                      </ActionIcon>
                    </Tooltip>
                  ) : (
                    <Tooltip zIndex={2000} position="bottom" label="Fullscreen">
                      <ActionIcon
                        data-testid="create-network-from-table-fullscreen-button"
                        variant="default"
                        onClick={() => setFullScreen(true)}
                      >
                        <IconWindowMaximize />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              }
              size="auto"
              withinPortal={false}
              opened={show}
              onClose={props.handleClose}
            >
              <Paper p="md" shadow="md" mih={600} miw={1000}>
                {content}
              </Paper>
            </Modal>
          </div>
        </ModalsProvider>
      </MantineProvider>
    </PrimeReactProvider>
  )
}
