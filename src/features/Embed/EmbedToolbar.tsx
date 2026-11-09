import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  AppBar,
  Box,
  Button,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { ReactElement } from 'react'

import logo from '../../assets/cytoscape.svg'
import { SearchBox } from '../ToolBar/Search'
import { LINK_OUT_LABEL } from './EmbedMessage'

interface EmbedToolbarProps {
  networkName: string
  linkOutUrl: string
}

/**
 * The embed's only chrome: the network name, the editor's search box and the
 * link to the editor. No menus, so none of their editing paths or keyboard
 * shortcuts are mounted.
 */
export const EmbedToolbar = ({
  networkName,
  linkOutUrl,
}: EmbedToolbarProps): ReactElement => (
  <AppBar position="static" sx={{ boxShadow: 'none' }}>
    <Toolbar
      data-testid="embed-toolbar"
      variant="dense"
      sx={{
        gap: 1,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? theme.palette.background.default
            : theme.palette.grey[900],
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <img src={logo} alt="Cytoscape Logo" />
      <Tooltip title={networkName}>
        <Typography
          data-testid="embed-network-name"
          variant="subtitle2"
          noWrap
          sx={{ minWidth: 0, flexShrink: 1 }}
        >
          {networkName}
        </Typography>
      </Tooltip>
      <Box sx={{ flexGrow: 1 }} />
      <SearchBox />
      <Button
        data-testid="embed-link-out"
        color="inherit"
        size="small"
        href={linkOutUrl}
        target="_blank"
        rel="noopener noreferrer"
        endIcon={<OpenInNewIcon fontSize="small" />}
        sx={{ flexShrink: 0, textTransform: 'none' }}
      >
        {LINK_OUT_LABEL}
      </Button>
    </Toolbar>
  </AppBar>
)
