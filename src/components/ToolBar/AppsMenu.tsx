import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { NestedMenuItem } from 'mui-nested-menu'
import { useState } from 'react'
import { RunCommunityDetectionFormDialog, runCommunityDetectionFormDialog } from '../CommunityDetection/RunCommunityDetectionFormDialog'

export const AppsMenu: React.FC = () => {

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setAnchorEl(event.currentTarget)
  }

  const [communityDetectionAlgorithms, setCommunityDetectionAlgorithms] = useState([]);

  const handleRunFunctionalEnrichment = (): void => {
    setAnchorEl(null)
  }

  const handleTallyAttributesOnHierarchy = (): void => {
    setAnchorEl(null)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  const labelId = `apps-dropdown`

  return (
    <div>
      <Button sx={{
        color: 'white',
        textTransform: 'none',
      }}
        id={labelId}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
      >
        Apps
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <NestedMenuItem label='Community Detection' onClick={handleClose} parentMenuOpen={open} nonce=''>
          <MenuItem onClick={() => {
            setAnchorEl(null)
            runCommunityDetectionFormDialog(true)
          }}>Run Community Detection</MenuItem>
          <MenuItem onClick={handleRunFunctionalEnrichment}>Run Functional Enrichment</MenuItem>
          <MenuItem onClick={handleTallyAttributesOnHierarchy}>Tally Attributes on Hierarchy</MenuItem>
        </NestedMenuItem>

      </Menu>
      <RunCommunityDetectionFormDialog />
    </div >
  )
}