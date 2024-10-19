import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import MenuItem from '@mui/material/MenuItem'
import { useServiceTaskRunner } from '../../../store/hooks/useServiceTaskRunner'
import { TaskStatusDialog } from '../../Util/TaskStatusDialog'

export const TestButton = ({ handleClose }: BaseMenuProps): ReactElement => {
  const serviceUrl =
    'https://cd.ndexbio.org/cy/cytocontainer/v1/updatetablesexample'

  const run = useServiceTaskRunner()

  const [openDialog, setOpenDialog] = useState<boolean>(false)

  const onClick = async (): Promise<void> => {
    setOpenDialog(true)
    await run(serviceUrl)
    handleClose()
    setOpenDialog(false)
  }

  return (
    <>
      <MenuItem onClick={onClick}>Community Detection Test</MenuItem>
      <TaskStatusDialog open={openDialog} setOpen={setOpenDialog} />
    </>
  )
}
