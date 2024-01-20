import { Button, Menu, MenuItem } from '@mui/material'
import { ServiceStatus } from './ServiceAppMetadata'
import { ReactElement, useState } from 'react'

/**
 *
 * @param serviceStatus
 * @returns
 */
export const buildMenu = (serviceStatus: ServiceStatus[]): ReactElement[] => {
  const menuItems: ReactElement[] = []

  serviceStatus.forEach((status: ServiceStatus) => {
    // A status includes all available algorithms form the service
    const { services, error, url } = status

    // If there is an error, we can't use this service at this time
    if (error !== undefined || services === undefined) {
      // Create a menu item with name, but disabled
      menuItems.push(
        <MenuItem key={url} disabled>
          {url}
        </MenuItem>,
      )
    } else {
      const { algorithms, name, description } = services
      const [anchorEl, setAnchorEl] = useState(null)

      const handleClick = (event: any): void => {
        setAnchorEl(event.currentTarget)
      }

      const handleClose = (): void => {
        setAnchorEl(null)
      }

      const baseMenuItem = (
        <div key={name}>
          <Button
            aria-controls="simple-menu"
            aria-haspopup="true"
            onClick={handleClick}
            title={description}
          >
            {name}
          </Button>
          <Menu
            id="simple-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            {algorithms.map((algorithm: Algorithm) => (
              <MenuItem
                key={algorithm.name}
                onClick={() => {
                  console.log('### Clicked', algorithm.name)
                  handleClose()
                }}
              >
                {algorithm.name}
              </MenuItem>
            ))}
          </Menu>
        </div>
      )
      menuItems.push(baseMenuItem)
    }
  })

  return menuItems
}
