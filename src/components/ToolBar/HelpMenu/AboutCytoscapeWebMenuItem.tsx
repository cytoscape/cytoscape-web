import React from 'react';
import { MenuItem, Dialog, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { BaseMenuProps } from '../BaseMenuProps';
import packageInfo from '../../../../package.json';

export const AboutCytoscapeWebMenuItem = (props: BaseMenuProps): React.ReactElement => {
  const [open, setOpen] = React.useState(false);

  const handleOpenDialog = (): void => {
    setOpen(true);
  };

  const handleCloseDialog = (): void => {
    setOpen(false);
    props.handleClose();
  };

  const gitCommitHash = (typeof process !== 'undefined' && process.env.REACT_APP_GIT_COMMIT_HASH) || 'N/A';
  const buildTimestamp = (typeof process !== 'undefined' && process.env.REACT_APP_BUILD_TIMESTAMP) || 'N/A';
  
  console.log("Git Commit Hash:", gitCommitHash);
  console.log("Build Timestamp:", buildTimestamp);
  
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
          <Typography variant="body1" gutterBottom>
            Commit: {gitCommitHash}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Date: {buildTimestamp}
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
  );
};
