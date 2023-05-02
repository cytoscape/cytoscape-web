import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNavigate } from 'react-router-dom'

export const ResetLocalWorkspaceMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const navigate = useNavigate()
  // const location = useLocation()
  // const workspace = useWorkspaceStore((state) => state.workspace)

  // const { id } = workspace

  // useEffect(() => {}, [id])

  // const deleteAllNetworks = useWorkspaceStore(
  //   (state) => state.deleteAllNetworks,
  // )
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)

  const handleReset = (): void => {
    props.handleClose()
    resetWorkspace()
    console.log('!!!!!!!!!!!!!!!!navigating to the new workspace', location)
    navigate(0)
  }

  return <MenuItem onClick={handleReset}>Clear all workspace data</MenuItem>
}
