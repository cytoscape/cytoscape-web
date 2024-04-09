import {
  Paper,
  Center,
  Title,
  Container,
  Space,
  MantineProvider,
} from '@mantine/core'

import { TableUpload } from './TableUpload'
import { TableColumnAssignmentForm } from './TableColumnAssignmentForm'
import { PrimeReactProvider } from 'primereact/api'
import {
  CreateNetworkFromTableStep,
  useCreateNetworkFromTableStore,
} from '../../store/createNetworkFromTableStore'
import { BaseMenuProps } from '../../../../components/ToolBar/BaseMenuProps'

export function CreateNetworkFromTableForm(props: BaseMenuProps) {
  const step = useCreateNetworkFromTableStore((state) => state.step)

  const stepContentMap = {
    [CreateNetworkFromTableStep.FileUpload]: (
      <TableUpload {...props}></TableUpload>
    ),
    [CreateNetworkFromTableStep.ColumnAssignmentForm]: (
      <TableColumnAssignmentForm {...props} />
    ),
  }

  const content = stepContentMap[step]

  return (
    <PrimeReactProvider>
      <MantineProvider>
        <Paper p="md" shadow="md" mih={600} miw={1000}>
          {content}
        </Paper>
      </MantineProvider>
    </PrimeReactProvider>
  )
}
