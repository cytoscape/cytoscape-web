import {
  ActionIcon,
  Center,
  Container,
  Group,
  MantineProvider,
  Modal,
  Paper,
  RemoveScroll,
  Space,
  Title,
  Tooltip,
} from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { IconWindowMaximize,IconWindowMinimize } from '@tabler/icons-react'
import { PrimeReactProvider } from 'primereact/api'
import { useState } from 'react'

import { BaseMenuProps } from '../../../ToolBar/BaseMenuProps'
import {
  JoinTableToNetworkStep,
  useJoinTableToNetworkStore,
} from '../../store/joinTableToNetworkStore'
import { TableColumnAssignmentForm } from '../CreateNetworkFromTable/TableColumnAssignmentForm'
import { TableUpload } from '../JoinTableToNetwork/TableUpload'
import { TableColumnAppendForm } from './TableColumnAppendForm'

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
            data-testid="join-table-to-network-modal"
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
                      data-testid="join-table-to-network-exit-fullscreen-button"
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
                      data-testid="join-table-to-network-fullscreen-button"
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
