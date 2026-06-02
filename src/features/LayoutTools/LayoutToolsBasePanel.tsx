import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Typography from '@mui/material/Typography'

import { LayoutToolsPanel } from './LayoutToolsPanel'

export const LayoutToolsBasePanel = (): JSX.Element => {
  return (
    <Accordion
      data-testid="layout-tools-accordion"
      sx={{
        backgroundColor: (theme) => theme.palette.background.paper,
        backgroundImage: 'none',
        boxShadow: 'none',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandLessIcon />}
        aria-controls="manual-layout"
        sx={{
          minHeight: '40px', // collapsed summary height
          '&.Mui-expanded': {
            minHeight: '40px', // expanded summary height
          },
          '.MuiAccordionSummary-content': {
            marginTop: '12px !important',
          },
        }}
      >
        <Typography>Layout Tools</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <LayoutToolsPanel />
      </AccordionDetails>
    </Accordion>
  )
}
