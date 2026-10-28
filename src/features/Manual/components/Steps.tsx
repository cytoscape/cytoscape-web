import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Alert, Box, Button, Typography } from '@mui/material'
import {
  Children,
  isValidElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useState,
} from 'react'

import { resolveManualAsset } from '../manualSlug'
import {
  findScreenshotSequence,
  type ScreenshotSequence,
  type SequenceFrame,
  sequenceFramePath,
} from '../screenshots/recipes'

/** The widest frame aspect: the image box keeps it, so steps do not jump. */
const IMAGE_ASPECT = '1280 / 1100'

/** The frame shown for list item `step` (1-based). */
const frameFor = (
  sequence: ScreenshotSequence,
  step: number,
): SequenceFrame => {
  const shown = sequence.frames.filter((frame) => frame.step <= step)
  return shown[shown.length - 1] ?? sequence.frames[0]
}

/** The `<li>` contents of the numbered list among `children`. */
const listItems = (children: ReactNode): ReactNode[] => {
  const items: ReactNode[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return
    if (child.type !== 'ol') return
    Children.forEach(child.props.children, (item) => {
      if (
        isValidElement<{ children?: ReactNode }>(item) &&
        item.type === 'li'
      ) {
        items.push(item.props.children)
      }
    })
  })
  return items
}

const frameSrc = (sequence: ScreenshotSequence, frame: SequenceFrame): string =>
  resolveManualAsset(
    sequenceFramePath(sequence.id, frame.id),
    import.meta.env.BASE_URL,
  )

/**
 * A numbered procedure in a page, shown one step at a time: the step's text
 * beside the image of a screenshot sequence (recipes.ts), with Back and Next
 * buttons and a button per step. Each image belongs to the list item its
 * frame names and to the items after it, up to the next frame. Below `md`
 * the image sits under the text.
 *
 *     <Steps sequence="import-table">
 *
 *     1. First step
 *     2. Second step
 *
 *     </Steps>
 */
export const Steps = ({
  sequence: sequenceId,
  children,
}: {
  sequence: string
  children: ReactNode
}): ReactElement => {
  const sequence = findScreenshotSequence(sequenceId)
  const items = listItems(children)
  const [step, setStep] = useState(1)

  if (sequence === undefined) {
    return <Alert severity="warning">Unknown step sequence: {sequenceId}</Alert>
  }

  const count = items.length
  const go = (next: number): void => setStep(Math.min(count, Math.max(1, next)))
  const current = frameFor(sequence, step)

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'ArrowRight') go(step + 1)
    else if (event.key === 'ArrowLeft') go(step - 1)
  }

  return (
    <Box
      component="section"
      aria-label={`${sequence.title}, step by step`}
      data-testid="manual-steps"
      data-sequence={sequence.id}
      data-step={step}
      onKeyDown={handleKeyDown}
      sx={{
        my: 3,
        p: { xs: 1.5, md: 2 },
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'minmax(16rem, 2fr) minmax(0, 3fr)',
          },
          gap: { xs: 1.5, md: 3 },
          alignItems: 'start',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            data-testid="manual-steps-counter"
            aria-live="polite"
            sx={{ lineHeight: 1.5 }}
          >
            Step {step} of {count}
          </Typography>
          <Box
            data-testid="manual-steps-text"
            sx={{ '& > :last-child': { mb: 0 }, minHeight: { md: '8rem' } }}
          >
            {items[step - 1]}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ChevronLeftIcon />}
              disabled={step <= 1}
              onClick={() => go(step - 1)}
              data-testid="manual-steps-previous"
            >
              Back
            </Button>
            <Button
              variant="contained"
              size="small"
              endIcon={<ChevronRightIcon />}
              disabled={step >= count}
              onClick={() => go(step + 1)}
              data-testid="manual-steps-next"
            >
              Next
            </Button>
          </Box>
        </Box>

        <Box component="figure" sx={{ m: 0 }}>
          <Box
            sx={{
              aspectRatio: IMAGE_ASPECT,
              maxWidth: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            {/* Every frame is in the page, so the next one is already loaded. */}
            {sequence.frames.map((frame) => (
              <Box
                key={frame.id}
                component="a"
                href={frameSrc(sequence, frame)}
                target="_blank"
                rel="noopener noreferrer"
                title="Open the full-size image"
                hidden={frame.id !== current.id}
                sx={{
                  display: frame.id === current.id ? 'flex' : 'none',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  component="img"
                  src={frameSrc(sequence, frame)}
                  alt={frame.alt}
                  data-testid="manual-steps-frame"
                  data-frame={frame.id}
                  sx={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
            ))}
          </Box>
          <Box
            component="figcaption"
            sx={{ mt: 0.75, fontSize: '0.875rem', color: 'text.secondary' }}
          >
            {current.alt}
          </Box>
        </Box>
      </Box>

      <Box
        role="group"
        aria-label="Go to step"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          mt: 2,
          pt: 1.5,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        {items.map((_item, index) => {
          const n = index + 1
          return (
            <Button
              key={n}
              size="small"
              variant={n === step ? 'contained' : 'text'}
              aria-label={`Step ${n}`}
              aria-current={n === step ? 'step' : undefined}
              data-testid={`manual-steps-go-${n}`}
              onClick={() => go(n)}
              sx={{ minWidth: 32, px: 0 }}
            >
              {n}
            </Button>
          )
        })}
      </Box>
    </Box>
  )
}
