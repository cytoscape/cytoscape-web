import '@/assets/icons.css'

import SearchIcon from '@mui/icons-material/Search'
import { Avatar, Box } from '@mui/material'
import type { ReactElement, ReactNode } from 'react'

import { ApplyLayoutIcon } from '@/features/FloatingToolBar/ApplyLayoutButton'
import { FitIcon } from '@/features/FloatingToolBar/FitButton'
import { OpenInCytoscapeIcon } from '@/features/FloatingToolBar/OpenInCytoscapeButton'
import { ShareIcon } from '@/features/FloatingToolBar/ShareNetworkButton'
import { NetworkSourceChip } from '@/features/SummaryPanel/NetworkSourceChip'
import {
  IMPORT_TABLE_GLYPH,
  INSERT_COLUMN_GLYPH,
} from '@/features/TableBrowser/components/TableToolbar'
import { columnMeaningIconMap } from '@/features/TableDataLoader/components/CreateNetworkFromTable/ColumnMeaningForm'
import { ColumnAssignmentType } from '@/features/TableDataLoader/model/ColumnAssignmentType'
import { SearchSettingsIcon } from '@/features/ToolBar/Search/SearchControls'
import { OpenPanelIcon } from '@/features/Workspace/SidePanel/OpenRightPanelButton'
import type { UiIconName } from './uiIconNames'

const glyph = (char: string): ReactNode => (
  <span className="icon" style={{ fontSize: '1.15em' }}>
    {char}
  </span>
)

/**
 * Icons and small labels of the app, drawn in manual text instead of
 * screenshots of them. Most entries import the exact icon the app's
 * component renders (the component exports it), so a changed icon changes
 * here too. Entries marked "copy" redraw it; the manual drift check lists
 * this file when their sources change (DEMO_COPIES in drift.ts).
 */
const UI_ICONS: Record<UiIconName, ReactNode> = {
  'apply-layout': <ApplyLayoutIcon fontSize="inherit" />,
  fit: <FitIcon fontSize="inherit" />,
  'open-in-cytoscape': <OpenInCytoscapeIcon fontSize="inherit" />,
  share: <ShareIcon fontSize="inherit" />,
  'search-settings': <SearchSettingsIcon fontSize="inherit" />,
  'open-panel': <OpenPanelIcon fontSize="inherit" />,
  'insert-column': glyph(INSERT_COLUMN_GLYPH),
  'import-table': glyph(IMPORT_TABLE_GLYPH),
  'ndex-label': <NetworkSourceChip isNdex />,
  'local-label': <NetworkSourceChip isNdex={false} />,
  'not-imported': columnMeaningIconMap[ColumnAssignmentType.NotImported],
  // copy: LoadFromNdexDialog's search button renders <Search />.
  'ndex-search': <SearchIcon fontSize="inherit" />,
  // copy: LoginButton's signed-out avatar.
  'sign-in': (
    <Avatar sx={{ bgcolor: '#DDDDDD', width: '1.2em', height: '1.2em' }}>
      {null}
    </Avatar>
  ),
}

/** One app icon inline in manual text, with its label for screen readers. */
export const UiIcon = ({
  name,
  label,
}: {
  name: UiIconName
  label: string
}): ReactElement => (
  <Box
    component="span"
    role="img"
    aria-label={label}
    title={label}
    data-testid={`manual-ui-icon-${name}`}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      verticalAlign: 'middle',
      mx: 0.25,
      fontSize: '1.25em',
      color: 'text.secondary',
      lineHeight: 1,
    }}
  >
    {UI_ICONS[name]}
  </Box>
)
