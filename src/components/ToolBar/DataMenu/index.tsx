import Button from '@mui/material/Button'
import { Divider } from '@mui/material'
import { RemoveAllNetworksMenuItem } from './RemoveAllNetworksMenuItem'
import { RemoveNetworkMenuItem } from './RemoveNetworkMenuItem'
import { LoadDemoNetworksMenuItem } from './LoadDemoNetworksMenuItem'
import { LoadFromNdexMenuItem } from './LoadFromNdexMenuItem'
import { SaveToNDExMenuItem } from './SaveToNDExMenuItem'
import { CopyNetworkToNDExMenuItem } from './CopyNetworkToNDExMenuItem'
import { UploadNetworkMenuItem } from './ImportNetworkFromFileMenuItem'
import { DownloadNetworkMenuItem } from './DownloadNetworkMenuItem'
import { OpenNetworkInCytoscapeMenuItem } from './OpenNetworkInCytoscapeMenuItem'
import { useRef, useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { ResetLocalWorkspaceMenuItem } from './ResetLocalWorkspace'
import { CreateNetworkFromTableFileMenuItem } from '../../../features/TableDataLoader/components/CreateNetworkFromTable/ImportNetworkFromTableMenuItem'
import { JoinTableToNetworkMenuItem } from '../../../features/TableDataLoader/components/JoinTableToNetwork/JoinTableToNetworkMenuItem'
import { TieredMenu } from 'primereact/tieredmenu'
import { PrimeReactProvider } from 'primereact/api'
import { OverlayPanel } from 'primereact/overlaypanel'

export const DataMenu: React.FC<DropdownMenuProps> = (
  props: DropdownMenuProps,
) => {
  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleOpenDropdownMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (): void => {
    ;(op.current as any)?.hide()
    setAnchorEl(null)
  }

  const op = useRef(null)

  const menuItems = [
    {
      label: 'Import',
      items: [
        {
          label: 'From NDEx',
          template: <LoadFromNdexMenuItem handleClose={handleClose} />,
        },
        {
          label: 'From File',
          template: <UploadNetworkMenuItem handleClose={handleClose} />,
        },
        {
          label: 'From Table',
          template: (
            <CreateNetworkFromTableFileMenuItem handleClose={handleClose} />
          ),
        },
        {
          label: '',
          template: <Divider />,
        },
        {
          label: 'Import Table',
          template: () => (
            <JoinTableToNetworkMenuItem handleClose={handleClose} />
          ),
        },
        {
          label: '',
          template: <Divider />,
        },
        {
          label: 'Demo Networks',
          template: <LoadDemoNetworksMenuItem handleClose={handleClose} />,
        },
      ],
    },
    {
      label: 'Export',
      items: [
        {
          label: 'To NDEx',
          items: [
            {
              label: 'Save to NDEx',
              template: () => <SaveToNDExMenuItem handleClose={handleClose} />,
            },
            {
              label: 'Copy to NDEx',
              template: () => (
                <CopyNetworkToNDExMenuItem handleClose={handleClose} />
              ),
            },
          ],
        },
        {
          label: 'Download',
          template: () => <DownloadNetworkMenuItem handleClose={handleClose} />,
        },
      ],
    },
    {
      label: 'Manage',
      items: [
        {
          label: 'Remove Current Network',
          template: () => <RemoveNetworkMenuItem handleClose={handleClose} />,
        },
        {
          label: 'Remove All Networks',
          template: () => (
            <RemoveAllNetworksMenuItem handleClose={handleClose} />
          ),
        },
        {
          label: 'Reset Local Workspace',
          template: () => (
            <ResetLocalWorkspaceMenuItem handleClose={handleClose} />
          ),
        },
      ],
    },
    {
      label: 'Open in Cytoscape',
      template: () => (
        <OpenNetworkInCytoscapeMenuItem handleClose={handleClose} />
      ),
    },
  ]

  return (
    <PrimeReactProvider>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={(e) => (op.current as any)?.toggle(e)}
      >
        {label}
      </Button>
      <OverlayPanel ref={op} unstyled>
        <TieredMenu model={menuItems} />
      </OverlayPanel>
    </PrimeReactProvider>
  )
}
