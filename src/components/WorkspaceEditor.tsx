import * as React from 'react'
import { Allotment } from 'allotment'
import { Box } from '@mui/material'
import BasicTabs from './Tabs'

export const WorkSpaceEditor: React.FC = () => {
  return (
    <Box sx={{ height: 'calc(100vh - 64px)' }}>
      <Allotment vertical>
        <Allotment.Pane>
          <Allotment>
            <Allotment.Pane preferredSize="30%">Side Panel</Allotment.Pane>
            <Allotment.Pane>Network View</Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
        <Allotment.Pane minSize={50} preferredSize={50}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              bgColor: 'primary.main',
              alignItems: 'center',
            }}
          >
            <BasicTabs />
          </Box>
        </Allotment.Pane>
      </Allotment>
    </Box>
  )
}
