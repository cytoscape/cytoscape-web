import AccountTreeIcon from '@mui/icons-material/AccountTree'
import HubIcon from '@mui/icons-material/Hub'
import InsightsIcon from '@mui/icons-material/Insights'
import PaletteIcon from '@mui/icons-material/Palette'
import TableChartIcon from '@mui/icons-material/TableChart'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MobileStepper,
  Typography,
} from '@mui/material'
import { ReactElement, useState } from 'react'

import {
  ConceptSlide,
  CONCEPT_SLIDES,
  WELCOME_INTRO,
  WELCOME_TITLE,
} from './content/concepts'

const ICONS: Record<ConceptSlide['icon'], typeof HubIcon> = {
  Hub: HubIcon,
  AccountTree: AccountTreeIcon,
  Palette: PaletteIcon,
  TableChart: TableChartIcon,
  Insights: InsightsIcon,
}

export interface WelcomeDialogProps {
  open: boolean
  /** Dismiss without starting the tour ("explore on my own" / close). */
  onSkip: () => void
  /** Dismiss and launch the guided tour. */
  onStartTour: () => void
}

/**
 * First-run concept primer. Introduces the core ideas (Workspace, Networks,
 * Visual Styles, Tables, Hierarchies) as a small carousel, then offers the
 * guided tour.
 */
export const WelcomeDialog = ({
  open,
  onSkip,
  onStartTour,
}: WelcomeDialogProps): ReactElement => {
  const [activeStep, setActiveStep] = useState(0)
  const maxSteps = CONCEPT_SLIDES.length
  const isLast = activeStep === maxSteps - 1
  const slide = CONCEPT_SLIDES[activeStep]
  const Icon = ICONS[slide.icon]

  const handleNext = (): void => {
    setActiveStep((prev) => Math.min(prev + 1, maxSteps - 1))
  }
  const handleBack = (): void => {
    setActiveStep((prev) => Math.max(prev - 1, 0))
  }

  return (
    <Dialog
      open={open}
      onClose={onSkip}
      maxWidth="sm"
      fullWidth
      data-testid="onboarding-welcome-dialog"
    >
      <DialogTitle>{WELCOME_TITLE}</DialogTitle>
      <DialogContent>
        {activeStep === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {WELCOME_INTRO}
          </Typography>
        )}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            minHeight: 220,
            justifyContent: 'center',
            px: 2,
          }}
        >
          <Icon color="primary" sx={{ fontSize: 56, mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            {slide.title}
          </Typography>
          {slide.body.map((paragraph, i) => (
            <Typography
              key={i}
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              {paragraph}
            </Typography>
          ))}
        </Box>
        <MobileStepper
          variant="dots"
          steps={maxSteps}
          position="static"
          activeStep={activeStep}
          sx={{ background: 'transparent', justifyContent: 'center', mt: 1 }}
          nextButton={
            <Button
              size="small"
              onClick={handleNext}
              disabled={isLast}
              data-testid="onboarding-welcome-next"
            >
              Next
            </Button>
          }
          backButton={
            <Button
              size="small"
              onClick={handleBack}
              disabled={activeStep === 0}
              data-testid="onboarding-welcome-back"
            >
              Back
            </Button>
          }
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onSkip} data-testid="onboarding-welcome-skip">
          Explore on my own
        </Button>
        <Button
          variant="contained"
          onClick={onStartTour}
          data-testid="onboarding-welcome-start-tour"
        >
          Take the tour
        </Button>
      </DialogActions>
    </Dialog>
  )
}
