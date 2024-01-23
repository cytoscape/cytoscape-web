import { useContext, useEffect, useState } from 'react'
import { ListItemText, Button, Menu, MenuItem } from '@mui/material'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { useServiceMetadata } from './useServiceMetadata'
import { ServiceStatus } from './ServiceAppMetadata'
import { AppConfigContext } from '../../../AppConfigContext'

export const AppMenu = ({ label }: DropdownMenuProps): JSX.Element => {
  const { defaultApps } = useContext(AppConfigContext)

  // For open the main menu with the Button
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const [openSubMenu, setOpenSubMenu] = useState<number | null>(null)

  const handleOpenSubMenu = (index: number): void => {
    setOpenSubMenu(index)
  }

  const handleCloseSubMenu = (): void => {
    setOpenSubMenu(null)
  }

  const handleOpenDropdownMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseDropdownMenu = (): void => {
    setAnchorEl(null)
    setOpenSubMenu(null)
  }

  const [serviceStatus, setServiceStatus] = useState<ServiceStatus[]>([])

  useEffect(() => {
    const fetchServices = async (): Promise<void> => {
      const result = await useServiceMetadata(defaultApps)
      setServiceStatus(result)
      console.log('#### Setting Available Service List', result)
    }

    fetchServices()
      .then((res) => {
        console.log('### Got #Available Service List')
      })
      .catch((error) => {
        console.warn('Error creating menu', error)
      })
      .finally(() => {})
  }, [])

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
        aria-haspopup="true"
        onClick={(event) => event.stopPropagation()}
      >
        {serviceStatus.map((status: ServiceStatus, index: number) => (
          <MenuItem
            key={index}
            onMouseEnter={() => handleOpenSubMenu(index)}
            onMouseLeave={handleCloseSubMenu}
            onClick={handleCloseDropdownMenu}
          >
            <ListItemText primary={status.services?.name} />
            {openSubMenu === index && (
              <Menu
                id={`submenu-${index}`}
                anchorEl={anchorEl}
                open={openSubMenu === index}
                keepMounted
                onClose={handleCloseDropdownMenu}
                onMouseLeave={handleCloseDropdownMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
              >
                {status.services?.algorithms?.map((alg, index) => (
                  <MenuItem key={index} onClick={handleCloseDropdownMenu}>
                    {alg.displayName}
                  </MenuItem>
                ))}
              </Menu>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
