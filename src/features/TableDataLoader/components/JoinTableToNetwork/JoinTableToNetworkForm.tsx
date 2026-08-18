import { BaseMenuItemProps } from '../../../ToolBar/BaseMenuItemProps'
import {
  JoinTableToNetworkStep,
  useJoinTableToNetworkStore,
} from '../../store/joinTableToNetworkStore'
import { TableLoaderDialogShell } from '../TableLoaderDialogShell'
import { TableUpload } from '../JoinTableToNetwork/TableUpload'
import { TableColumnAppendForm } from './TableColumnAppendForm'

export function JoinTableToNetworkForm(props: BaseMenuItemProps) {
  const step = useJoinTableToNetworkStore((state) => state.step)
  const show = useJoinTableToNetworkStore((state) => state.show)
  const setShow = useJoinTableToNetworkStore((state) => state.setShow)

  const stepContentMap = {
    [JoinTableToNetworkStep.FileUpload]: <TableUpload></TableUpload>,
    [JoinTableToNetworkStep.ColumnAppendForm]: (
      <TableColumnAppendForm {...props} />
    ),
  }

  const title =
    step === JoinTableToNetworkStep.FileUpload
      ? 'Upload Tabular Data File'
      : 'Edit Column Definitions'

  return (
    <TableLoaderDialogShell
      show={show}
      title={title}
      onClose={() => {
        props.onClick()
        setShow(false)
      }}
      testIdPrefix="join-table-to-network"
      minHeight={1000}
      minWidth={1000}
    >
      {stepContentMap[step]}
    </TableLoaderDialogShell>
  )
}
