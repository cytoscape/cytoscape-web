import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { LayoutToolsPanel } from './LayoutToolsPanel'

export const LayoutToolsBasePanel = (): JSX.Element => {
  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="manual-layout"
      >
        <Typography>Layout Tools</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <LayoutToolsPanel />
      </AccordionDetails>
    </Accordion>
  )
}
