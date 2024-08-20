import { MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import packageInfo from '../../../../package.json'

export const AboutCytoscapeWebMenuItem = (props: BaseMenuProps): ReactElement => {
  const [open, setOpen] = useState(false)

  const handleOpenDialog = (): void => {
    setOpen(true)
  }

  const handleCloseDialog = (): void => {
    setOpen(false)
    props.handleClose()
  }

  return (
    <>
      <MenuItem onClick={handleOpenDialog}>
        About Cytoscape Web
      </MenuItem>
      <Dialog open={open} onClose={handleCloseDialog}>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Cytoscape Web
          </Typography>
          <Typography variant="body1" gutterBottom>
            Version: {packageInfo.version}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            A web-based network visualization and analysis platform
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
