import { useEffect, useState } from 'react'
import { AppDefinition, AppType } from './AppDefinition'
import {
  ListItemIcon,
  ListItemText,
  Button,
  Menu,
  MenuItem,
} from '@mui/material'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { useServiceMetadata } from './useServiceMetadata'
import { ServiceStatus } from './ServiceAppMetadata'

export const EXAMPLE_CONFIG: AppDefinition[] = [
  // Add your AppDefinition objects here
  {
    type: AppType.Service,
    url: 'http://cd.ndexbio.org/cd/communitydetection/v1',
  },
  {
    type: AppType.Service,
    url: 'http://cdservice.cytoscape.org/cd/communitydetection/v1/algorithms',
  },
]

export const AppMenu = ({ label }: DropdownMenuProps): JSX.Element => {
  // For open the main menu with the Button
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleOpenDropdownMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseDropdownMenu = (): void => {
    setAnchorEl(null)
  }

  const [serviceStatus, setServiceStatus] = useState<ServiceStatus[]>([])

  useEffect(() => {
    const fetchServices = async (): Promise<void> => {
      const result = await useServiceMetadata(EXAMPLE_CONFIG)
      setServiceStatus(result)
      console.log('#### Setting Available Service List', result)
    }

    fetchServices()
      .then((res) => {
        console.log('### Got #Available Service List', res)
      })
      .catch((error) => {
        console.warn('Error', error)
      })
      .finally(() => {
        console.log('Finally OK')
      })
  }, [])

  useEffect(() => {
    console.log('*** Service Status UPDATE', serviceStatus)
  }, [serviceStatus])

  return (
    <>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleOpenDropdownMenu}
      >
        {label}
      </Button>

      <Menu
        id="app-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        keepMounted
        onClose={handleCloseDropdownMenu}
        onMouseLeave={handleCloseDropdownMenu}
      >
        {EXAMPLE_CONFIG.map((app, index) => (
          <MenuItem key={index} onClick={handleCloseDropdownMenu}>
            <ListItemIcon>{/* Add your icon here */}</ListItemIcon>
            <ListItemText primary={app.url} />
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
