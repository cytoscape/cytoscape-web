import {
  Paper,
  Center,
  Title,
  Container,
  Space,
  MantineProvider,
  Modal,
  RemoveScroll,
  Tooltip,
  ActionIcon,
  Group,
} from '@mantine/core'

import { TableUpload } from '../JoinTableToNetwork/TableUpload'
import { TableColumnAssignmentForm } from '../CreateNetworkFromTable/TableColumnAssignmentForm'
import { PrimeReactProvider } from 'primereact/api'
import {
  useJoinTableToNetworkStore,
  JoinTableToNetworkStep,
} from '../../store/joinTableToNetworkStore'
import { BaseMenuProps } from '../../../../components/ToolBar/BaseMenuProps'
import { TableColumnAppendForm } from './TableColumnAppendForm'
import { ModalsProvider } from '@mantine/modals'
import { useState } from 'react'
import { IconWindowMinimize, IconWindowMaximize } from '@tabler/icons-react'

export function JoinTableToNetworkForm(props: BaseMenuProps) {
  const step = useJoinTableToNetworkStore((state) => state.step)
  const show = useJoinTableToNetworkStore((state) => state.show)
  const setShow = useJoinTableToNetworkStore((state) => state.setShow)
  const [fullScreen, setFullScreen] = useState(false)

  const stepContentMap = {
    [JoinTableToNetworkStep.FileUpload]: <TableUpload {...props}></TableUpload>,
    [JoinTableToNetworkStep.ColumnAppendForm]: (
      <TableColumnAppendForm {...props} />
    ),
  }

  const content = stepContentMap[step]
  const title =
    step === JoinTableToNetworkStep.FileUpload
      ? 'Upload Tabular Data File'
      : 'Edit Column Definitions'

  return (
    <MantineProvider>
      <PrimeReactProvider>
        <ModalsProvider>
          <Modal
            zIndex={999999}
            centered
            fullScreen={fullScreen}
            title={
              <Group justify="space-between">
                <Title c="gray" order={4}>
                  {title}
                </Title>
                {fullScreen ? (
                  <Tooltip
                    zIndex={9999999}
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
                  <Tooltip
                    zIndex={9999999}
                    position="bottom"
                    label="Fullscreen"
                  >
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
            onClose={() => {
              props.handleClose()
              setShow(false)
            }}
          >
            <Paper p="md" shadow="md" mih={1000} miw={1000}>
              {content}
            </Paper>
          </Modal>
        </ModalsProvider>
      </PrimeReactProvider>
    </MantineProvider>
  )
}
