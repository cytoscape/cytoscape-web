import './menuItem.css'

import { Divider } from '@mui/material'
import React, { useState } from 'react'

import { JoinTableToNetworkMenuItem } from '../../TableDataLoader/components/JoinTableToNetwork/JoinTableToNetworkMenuItem'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { CopyNetworkToNDExMenuItem } from './CopyNetworkToNDExMenuItem'
import { DownloadNetworkMenuItem } from './DownloadNetworkMenuItem'
import { ExportImageMenuItem } from './ExportNetworkToImage/DynamicExportImageMenuItem'
import { UploadNetworkMenuItem } from './ImportNetworkFromFileMenuItem'
import { LoadDemoNetworksMenuItem } from './LoadDemoNetworksMenuItem'
import { LoadFromNdexMenuItem } from './LoadFromNdexMenuItem'
import { LoadWorkspaceMenuItem } from './LoadWorkspaceMenuItem'
import { OpenNetworkInCytoscapeMenuItem } from './OpenNetworkInCytoscapeMenuItem'
import { RemoveAllNetworksMenuItem } from './RemoveAllNetworksMenuItem'
import { RemoveNetworkMenuItem } from './RemoveNetworkMenuItem'
import { ResetLocalWorkspaceMenuItem } from './ResetLocalWorkspace'
import { SaveToNDExMenuItem } from './SaveToNDExMenuItem'
import { SaveWorkspaceToNDExMenuItem } from './SaveWorkspaceToNDEx'
import { SaveWorkspaceToNDExOverwriteMenuItem } from './SaveWorkspaceToNDExOverwrite'
import { DropdownMenu } from '../DropdownMenu'

export const DataMenu: React.FC<DropdownMenuProps> = (
  props: DropdownMenuProps,
) => {
  const { label } = props
  const [open, setOpen] = useState(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const menuItems = [
    {
      label: 'Open network(s) from NDEx...',
      template: <LoadFromNdexMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Open workspace from NDEx...',
      template: <LoadWorkspaceMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Open Sample Networks',
      template: <LoadDemoNetworksMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Open in Cytoscape',
      template: () => (
        <OpenNetworkInCytoscapeMenuItem handleClose={handleClose} />
      ),
    },
    {
      label: 'Import',
      items: [
        {
          label: 'From File',
          template: <UploadNetworkMenuItem handleClose={handleClose} />,
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
      ],
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Save to NDEx',
      template: () => <SaveToNDExMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Copy to NDEx',
      template: () => <CopyNetworkToNDExMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Download',
      template: () => <DownloadNetworkMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Save Workspace to NDEx (overwrite)',
      template: () => (
        <SaveWorkspaceToNDExOverwriteMenuItem handleClose={handleClose} />
      ),
    },
    {
      label: 'Save Workspace to NDEx',
      template: () => <SaveWorkspaceToNDExMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Export',
      items: [
        {
          label: 'Network to Image...',
          template: <ExportImageMenuItem handleClose={handleClose} />,
        },
      ],
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Remove Current Network',
      template: () => <RemoveNetworkMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Remove All Networks',
      template: () => <RemoveAllNetworksMenuItem handleClose={handleClose} />,
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Reset Local Workspace',
      template: () => <ResetLocalWorkspaceMenuItem handleClose={handleClose} />,
    },
  ]

  return (
    <DropdownMenu
      id={label}
      label={label}
      menuItems={menuItems}
      open={open}
      onOpenChange={setOpen}
    />
  )
}
