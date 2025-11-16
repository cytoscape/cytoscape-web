import '../DataMenu/menuItem.css'

import { Divider } from '@mui/material'
import Button from '@mui/material/Button'
import { PrimeReactProvider } from 'primereact/api'
import { OverlayPanel } from 'primereact/overlaypanel'
import { TieredMenu } from 'primereact/tieredmenu'
import { useRef } from 'react'

import { DropdownMenuProps } from '../DropdownMenuProps'
import { AboutCytoscapeWebMenuItem } from './AboutCytoscapeWebMenuItem'
import { BugReportMenuItem } from './BugReportMenuItem'
import { CitationMenuItem } from './CitationMenuItem'
import { CodeRepositoryMenuItem } from './CodeRepositoryMenuitem'
import { DeveloperMenuItem } from './DeveloperMenuItem'
import { ExportDatabaseMenuItem } from './ExportDatabaseMenuItem'
import { ImportDatabaseMenuItem } from './ImportDatabaseMenuItem'
import { TutorialMenuItem } from './TutorialMenuItem'

export const HelpMenu = (props: DropdownMenuProps): JSX.Element => {
  const { label } = props
  const op = useRef(null)

  const handleClose = (): void => {
    ;(op.current as any)?.hide()
  }

  const menuItems = [
    {
      label: 'About Cytoscape Web',
      template: <AboutCytoscapeWebMenuItem handleClose={handleClose} />,
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Tutorial',
      template: <TutorialMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Developer',
      items: [
        {
          label: "Developer's Guide",
          template: <DeveloperMenuItem handleClose={handleClose} />,
        },
        {
          label: 'Export Database...',
          template: <ExportDatabaseMenuItem handleClose={handleClose} />,
        },
        {
          label: 'Import Database...',
          template: <ImportDatabaseMenuItem handleClose={handleClose} />,
        },
      ],
    },
    {
      label: 'Code Repository',
      template: <CodeRepositoryMenuItem handleClose={handleClose} />,
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Citation',
      template: <CitationMenuItem handleClose={handleClose} />,
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Bug Report',
      template: <BugReportMenuItem handleClose={handleClose} />,
    },
  ]

  return (
    <PrimeReactProvider>
      <Button
        data-testid="toolbar-help-menu-button"
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        aria-haspopup="true"
        onClick={(e) => (op.current as any)?.toggle(e)}
      >
        {label}
      </Button>
      <OverlayPanel ref={op} unstyled>
        <TieredMenu style={{ width: 350 }} model={menuItems} />
      </OverlayPanel>
    </PrimeReactProvider>
  )
}
