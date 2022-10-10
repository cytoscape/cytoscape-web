import * as React from 'react'
import Box from '@mui/material/Box'

import { Workspace } from '../models'

interface WorkspaceViewProps {
  workspace: Workspace
}

export default function WorkspaceView(
  props: WorkspaceViewProps,
): React.ReactElement {
  const { workspace } = props

  return <Box sx={{}}>{JSON.stringify(workspace, null, 2)}</Box>
}
