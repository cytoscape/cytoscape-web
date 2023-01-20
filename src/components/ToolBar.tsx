import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import InputBase from '@mui/material/InputBase'
import { alpha, styled } from '@mui/material/styles'
import Toolbar from '@mui/material/Toolbar'
import * as React from 'react'
import { AppsMenu } from './ToolBar/AppsMenu'
import { DropdownMenu } from './ToolBar/DropdownMenu'

import logo from '../assets/cytoscape.svg'

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  //   '&:hover': {
  //     backgroundColor: alpha(theme.palette.common.white, 0.25),
  //   },
  marginLeft: 0,
  height: 32,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: 'auto',
  },
}))

const SearchControlsWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  right: 0,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(1)})`,
    transition: theme.transitions.create('width'),
    height: '100%',
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: '50ch',
    },
  },
}))

export const ToolBar: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar
          variant="dense"
          sx={{ justifyContent: 'space-between', backgroundColor: '#4F4F4F' }}
        >
          <Box sx={{ display: 'flex' }}>
            <img src={logo} />
            <DropdownMenu label="Data" />
            <DropdownMenu label="Edit" />
            <DropdownMenu label="View" />
            <DropdownMenu label="Select" />
            <AppsMenu />
            <DropdownMenu label="Layout" />
            <DropdownMenu label="Analysis" />
            <DropdownMenu label="Help" />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Search>
              <SearchControlsWrapper>
                <SearchIcon />
                <TuneIcon />
              </SearchControlsWrapper>
              <StyledInputBase
                placeholder="Search this network"
                inputProps={{ 'aria-label': 'search' }}
              />
            </Search>
            <Avatar sx={{ marginLeft: 2, width: 30, height: 30 }} />
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  )
}
