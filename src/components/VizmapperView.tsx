import * as React from 'react'
import Box from '@mui/material/Box'

// import { AppContext } from '../states/AppStateProvider'
import { VisualStyle } from '../models/Style'

interface VizmmaperView {
  networkStyle: VisualStyle
}

export default function VizmapperView(
  props: VizmmaperView,
): React.ReactElement {
  const { networkStyle } = props

  return <Box sx={{}}>{JSON.stringify(networkStyle, null, 2)}</Box>
}
