import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'

import logo from '../../assets/cytoscape.svg'
import { LoginButton } from '../Login/LoginButton'
import { AnalysisMenu } from './AnalysisMenu'
import { AppMenu } from './AppMenu'
import { DataMenu } from './DataMenu'
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
          backgroundColor: (theme) => theme.palette.grey[800],
          boxShadow: 'none',
          p: (theme) => theme.spacing(0.5),
        }}
      >
        <Toolbar
          data-testid="toolbar"
          variant="dense"
          sx={{ 
            justifyContent: 'space-between',
            backgroundColor: (theme) => theme.palette.grey[800],
            borderRadius: (theme) => theme.spacing(1),
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
            <SearchBox />
            <LoginButton />
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  )
}
