import {
  Paper,
  Center,
  Title,
  Container,
  Space,
  MantineProvider,
  Modal,
  RemoveScroll,
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

export function JoinTableToNetworkForm(props: BaseMenuProps) {
  const step = useJoinTableToNetworkStore((state) => state.step)
  const show = useJoinTableToNetworkStore((state) => state.show)
  const setShow = useJoinTableToNetworkStore((state) => state.setShow)

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
            title={
              <Center>
                <Title c="gray" order={4}>
                  {title}
                </Title>
              </Center>
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
