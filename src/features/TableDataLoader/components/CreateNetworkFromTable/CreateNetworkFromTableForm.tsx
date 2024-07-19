import {
  Paper,
  Title,
  MantineProvider,
  ActionIcon,
  Group,
  Modal,
  Tooltip,
} from '@mantine/core'

import { TableColumnAssignmentForm } from './TableColumnAssignmentForm'
import { PrimeReactProvider } from 'primereact/api'
import {
  CreateNetworkFromTableStep,
  useCreateNetworkFromTableStore,
} from '../../store/createNetworkFromTableStore'
import { BaseMenuProps } from '../../../../components/ToolBar/BaseMenuProps'
import { ModalsProvider } from '@mantine/modals'
import { IconWindowMinimize, IconWindowMaximize } from '@tabler/icons-react'
import { useState } from 'react'

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
                        variant="default"
                        onClick={() => setFullScreen(false)}
                      >
                        <IconWindowMinimize />
                      </ActionIcon>
                    </Tooltip>
                  ) : (
                    <Tooltip zIndex={2000} position="bottom" label="Fullscreen">
                      <ActionIcon
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
