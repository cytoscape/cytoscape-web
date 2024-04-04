import {
  Paper,
  Center,
  Title,
  Container,
  Space,
  MantineProvider,
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

export function JoinTableToNetworkForm(props: BaseMenuProps) {
  const step = useJoinTableToNetworkStore((state) => state.step)

  const stepContentMap = {
    [JoinTableToNetworkStep.FileUpload]: <TableUpload {...props}></TableUpload>,
    [JoinTableToNetworkStep.ColumnAppendForm]: (
      <TableColumnAppendForm {...props} />
    ),
  }

  const content = stepContentMap[step]

  return (
    <PrimeReactProvider>
      <MantineProvider>
        <Container p="md" bg="#D6D6D6">
          <Paper p="md" shadow="md">
            {content}
          </Paper>
        </Container>
      </MantineProvider>
    </PrimeReactProvider>
  )
}
