import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Typography from '@mui/material/Typography'

import { LayoutToolsPanel } from './LayoutToolsPanel'

export const LayoutToolsBasePanel = (): JSX.Element => {
  return (
    <Accordion data-testid="layout-tools-accordion">
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="manual-layout"
        sx={{
          minHeight: '44px', // collapsed summary height
          '&.Mui-expanded': {
            minHeight: '44px', // expanded summary height
          },
          '.MuiAccordionSummary-content': {
            margin: 0,
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
