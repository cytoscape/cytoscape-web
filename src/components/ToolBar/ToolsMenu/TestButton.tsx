import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import MenuItem from '@mui/material/MenuItem'
import { useServiceTaskRunner } from '../../../store/hooks/useServiceTaskRunner'

export const TestButton = ({ handleClose }: BaseMenuProps): ReactElement => {
  const serviceUrl =
    'https://cd.ndexbio.org/cy/cytocontainer/v1/updatetablesexample'

  const run = useServiceTaskRunner()

  const onClick = async (): Promise<void> => {
    await run(serviceUrl)
    handleClose()
  }

  return <MenuItem onClick={onClick}>Community Detection Test</MenuItem>
}
