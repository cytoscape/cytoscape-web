import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'

import { DataMenu } from './DataMenu'

import logo from '../../assets/cy-web.svg'
import { LoginButton } from '../Login/LoginButton'
import { LayoutMenu } from './LayoutMenu'
import { EditMenu } from './EditMenu'
import { SearchBox } from './Search'
import { AnalysisMenu } from './AnalysisMenu'
import { ToolsMenu } from './ToolsMenu'
import { HelpMenu } from './HelpMenu'
import { AppMenu } from './AppMenu'
import { LicenseMenu } from './LicenseMenu'

export const ToolBar = (): JSX.Element => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
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
            <HelpMenu label="Help" />
            <LicenseMenu label="License" />
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
