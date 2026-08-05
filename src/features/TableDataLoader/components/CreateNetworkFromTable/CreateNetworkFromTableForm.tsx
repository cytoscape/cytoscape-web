import { BaseMenuItemProps } from '../../../ToolBar/BaseMenuItemProps'
import {
  CreateNetworkFromTableStep,
  useCreateNetworkFromTableStore,
} from '../../store/createNetworkFromTableStore'
import { TableLoaderDialogShell } from '../TableLoaderDialogShell'
import { TableColumnAssignmentForm } from './TableColumnAssignmentForm'

export function CreateNetworkFromTableForm(props: BaseMenuItemProps) {
  const step = useCreateNetworkFromTableStore((state) => state.step)
  const show = useCreateNetworkFromTableStore((state) => state.show)

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

  return (
    <TableLoaderDialogShell
      show={show}
      title={title}
      onClose={props.onClick}
      testIdPrefix="create-network-from-table"
      minHeight={600}
      minWidth={1000}
    >
      {stepContentMap[step]}
    </TableLoaderDialogShell>
  )
}
