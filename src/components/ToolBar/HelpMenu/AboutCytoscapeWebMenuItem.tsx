import React from 'react';
import { MenuItem, Dialog, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { BaseMenuProps } from '../BaseMenuProps';
import packageInfo from '../../../../package.json';
import { getDatabaseVersion } from '../../../store/persist/db'

export const AboutCytoscapeWebMenuItem = (props: BaseMenuProps): React.ReactElement => {
  const [open, setOpen] = React.useState(false);

  const handleOpenDialog = (): void => {
    setOpen(true);
  };

  const handleCopyInfo = () => {
    const infoToCopy = `Version: ${packageInfo.version}\nBuild ID: ${commitHash}\nBuild Date: ${buildDate}\nCache Version: ${getDatabaseVersion()}`;
    navigator.clipboard.writeText(infoToCopy).then(() => {
      alert('Information copied to clipboard!');
    }).catch((err) => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleCloseDialog = (): void => {
    setOpen(false);
    props.handleClose();
  };

  const commitHash = process.env.REACT_APP_GIT_COMMIT
  ? process.env.REACT_APP_GIT_COMMIT.substring(0, 7)
  : 'N/A';  const buildDate = process.env.REACT_APP_BUILD_DATE
  ? new Date(process.env.REACT_APP_BUILD_DATE).toLocaleString()
  : 'N/A'; 
  
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
          <Typography variant="body2" gutterBottom>
            Build ID: {commitHash}
          </Typography>
          <Typography variant="body2" gutterBottom>
            Build Date: {buildDate}
          </Typography>
          <Typography variant="body2" gutterBottom>
            Cache Version: {getDatabaseVersion()}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            A web-based network visualization and analysis platform
          </Typography>
        </DialogContent>
        <DialogActions>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>

          <Button onClick={handleCopyInfo} color="primary">
            Copy
          </Button>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};
