import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'

import logo from '../../assets/cytoscape.svg'
import { LoginButton } from '../Login/LoginButton'
import { AnalysisMenu } from './AnalysisMenu'
import { AppMenu } from './AppMenu'
import { DataMenu } from './DataMenu'
import { DebugIndicator } from './DebugIndicator'
import { EditMenu } from './EditMenu'
import { HelpMenu } from './HelpMenu'
import { LayoutMenu } from './LayoutMenu'
import { SearchBox } from './Search'
import { ToolsMenu } from './ToolsMenu'


export const ToolBar = (): JSX.Element => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        sx={{
          boxShadow: 'none',
        }}
      >
        <Toolbar
          data-testid="toolbar"
          variant="dense"
          sx={{ 
            justifyContent: 'space-between',
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.grey[900],
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ display: 'flex' }}>
            <img src={logo} alt="Cytoscape Logo" />
            <DataMenu />
            <EditMenu />
            <LayoutMenu />
            <AnalysisMenu />
            <ToolsMenu />
            <AppMenu />
            <HelpMenu />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DebugIndicator />
            <SearchBox />
            <LoginButton />
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  )
}
