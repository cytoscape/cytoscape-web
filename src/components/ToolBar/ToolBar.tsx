import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'

import { DataMenu } from './DataMenu'

import logo from '../../assets/cytoscape.svg'
import { LoginButton } from '../Login/LoginButton'
import { LayoutMenu } from './LayoutMenu'
import { EditMenu } from './EditMenu'
import { SearchBox } from './Search'
import { AnalysisMenu } from './AnalysisMenu'
import { ToolsMenu } from './ToolsMenu'
import { AppMenu } from './AppMenu'

export const ToolBar = (): JSX.Element => {
  return (
    <AppBar position="static" sx={{ p: 0, margin: 0 }}>
      <Toolbar
        variant="dense"
        sx={{ justifyContent: 'space-between', backgroundColor: '#4F4F4F' }}
      >
        <Box sx={{ display: 'flex' }}>
          <img src={logo} />
          <DataMenu label="Data" />
          <EditMenu label="Edit" />
          <LayoutMenu label="Layout" />
          {/* <DropdownMenu label="Help" /> */}
          <AnalysisMenu label="Analysis" />
          <ToolsMenu label="Tools" />
          <AppMenu label="Apps" />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SearchBox />
          <LoginButton />
        </Box>
      </Toolbar>
    </AppBar>
  )
}
