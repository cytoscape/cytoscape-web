import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import { Alert, Box, IconButton, Tooltip, Typography } from '@mui/material'
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { resolveManualAsset } from '../manualSlug'
import {
  findScreenshotSequence,
  type ScreenshotSequence,
  type SequenceFrame,
  sequenceFramePath,
} from '../screenshots/recipes'
import { useDemoSlot } from './DemoSlot'

/** Events that mean the reader moved the page themselves. */
const READER_SCROLL_EVENTS = ['wheel', 'touchmove', 'keydown'] as const

/**
 * A step is current once its top passes this share of the viewport height.
 * The middle: the arrows center the step they choose.
 */
const READING_LINE = 0.5

const frameSrc = (sequence: ScreenshotSequence, frame: SequenceFrame): string =>
  resolveManualAsset(
    sequenceFramePath(sequence.id, frame.id),
    import.meta.env.BASE_URL,
  )

/** The frame shown for list item `step` (1-based; 0 is before the list). */
const frameFor = (
  sequence: ScreenshotSequence,
  step: number,
): SequenceFrame => {
  const shown = sequence.frames.filter((frame) => frame.step <= step)
  return shown[shown.length - 1] ?? sequence.frames[0]
}

/**
 * The list item the reader is on: the last one whose top has passed the
 * reading line, or 0 while the list is still below it. Recomputed on scroll
 * and resize.
 */
const useStepInView = (list: HTMLElement | null, enabled: boolean): number => {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (list === null || !enabled) return
    let frame = 0
    const update = (): void => {
      frame = 0
      const line = window.innerHeight * READING_LINE
      let current = 0
      for (const item of list.querySelectorAll<HTMLElement>(
        'li[data-manual-step]',
      )) {
        if (item.getBoundingClientRect().top > line) break
        current = Number(item.dataset.manualStep)
      }
      setStep(current)
    }
    const schedule = (): void => {
      if (frame === 0) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [list, enabled])
  return step
}

const FrameImage = ({
  sequence,
  frame,
  lazy,
  hidden = false,
  onClick,
}: {
  sequence: ScreenshotSequence
  frame: SequenceFrame
  lazy: boolean
  hidden?: boolean
  onClick?: () => void
}): ReactElement => (
  <Box
    component="img"
    src={frameSrc(sequence, frame)}
    alt={frame.alt}
    loading={lazy ? 'lazy' : 'eager'}
    data-testid="manual-steps-frame"
    data-frame={frame.id}
    hidden={hidden}
    onClick={onClick}
    sx={{
      display: hidden ? 'none' : 'block',
      maxWidth: '100%',
      maxHeight: '100%',
      height: 'auto',
      objectFit: 'contain',
      border: 1,
      borderColor: 'divider',
      borderRadius: 1,
      cursor: onClick === undefined ? undefined : 'zoom-in',
    }}
  />
)

/** The pinned column: the frame of the current step, with step controls. */
const StepsPanel = ({
  sequence,
  step,
  stepCount,
  onStep,
}: {
  sequence: ScreenshotSequence
  step: number
  stepCount: number
  onStep: (step: number) => void
}): ReactElement => {
  const { expanded, setExpanded } = useDemoSlot()
  const current = frameFor(sequence, step)
  return (
    <Box
      data-testid="manual-steps-panel"
      data-step={step}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 1.5,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {sequence.title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            data-testid="manual-steps-counter"
          >
            {step === 0
              ? `${stepCount} steps, starting below`
              : `Step ${step} of ${stepCount}`}
          </Typography>
        </Box>
        <Tooltip title="Previous step">
          <span>
            <IconButton
              size="small"
              aria-label="Previous step"
              data-testid="manual-steps-previous"
              disabled={step <= 1}
              onClick={() => onStep(step - 1)}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Next step">
          <span>
            <IconButton
              size="small"
              aria-label="Next step"
              data-testid="manual-steps-next"
              disabled={step >= stepCount}
              onClick={() => onStep(step + 1)}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={expanded ? 'Shrink' : 'Expand'}>
          <IconButton
            size="small"
            aria-label={expanded ? 'Shrink' : 'Expand'}
            data-testid="manual-steps-expand"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <CloseFullscreenIcon fontSize="small" />
            ) : (
              <OpenInFullIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        {/* Every frame is in the page so the next one is already loaded. */}
        {sequence.frames.map((frame) => (
          <FrameImage
            key={frame.id}
            sequence={sequence}
            frame={frame}
            lazy={false}
            hidden={frame.id !== current.id}
            onClick={() => setExpanded(!expanded)}
          />
        ))}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {current.alt}
      </Typography>
    </Box>
  )
}

/**
 * A numbered procedure in a page, paired with the images of a screenshot
 * sequence (recipes.ts). Each image belongs to the list item its frame names
 * and to the items after it, up to the next frame.
 *
 * On wide screens the images show in the page's pinned column (DemoSlot): the
 * column follows the step the reader has scrolled to, and clicking a step or
 * the arrows changes it. Otherwise each image sits under its step.
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
  const { target, register } = useDemoSlot()
  useEffect(register, [register])
  const [list, setList] = useState<HTMLElement | null>(null)
  const pinned = target !== null
  const inView = useStepInView(list, pinned)

  // A step the reader chose (click, arrows) holds until they scroll.
  const [chosen, setChosen] = useState<number>()
  useEffect(() => {
    if (chosen === undefined) return
    const release = (): void => setChosen(undefined)
    for (const event of READER_SCROLL_EVENTS) {
      window.addEventListener(event, release, { passive: true })
    }
    return () => {
      for (const event of READER_SCROLL_EVENTS) {
        window.removeEventListener(event, release)
      }
    }
  }, [chosen])
  const step = chosen ?? inView

  const choose = useCallback(
    (next: number): void => {
      setChosen(next)
      list
        ?.querySelector(`li[data-manual-step="${next}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    },
    [list],
  )

  if (sequence === undefined) {
    return <Alert severity="warning">Unknown step sequence: {sequenceId}</Alert>
  }

  let stepCount = 0
  const withFrames = Children.map(children, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child) || child.type !== 'ol')
      return child
    return cloneElement(
      child,
      {},
      Children.map(child.props.children, (item) => {
        if (
          !isValidElement<{ children?: ReactNode }>(item) ||
          item.type !== 'li'
        )
          return item
        stepCount += 1
        const n = stepCount
        const frame = pinned
          ? undefined
          : sequence.frames.find((f) => f.step === n)
        return cloneElement(
          item,
          {
            'data-manual-step': n,
            'data-active': pinned && n === step ? 'true' : undefined,
            onClick: pinned ? () => setChosen(n) : undefined,
          } as Record<string, unknown>,
          item.props.children,
          frame === undefined ? null : (
            <Box sx={{ my: 1.5 }}>
              <FrameImage sequence={sequence} frame={frame} lazy />
            </Box>
          ),
        )
      }),
    )
  })

  return (
    <Box
      ref={setList}
      data-testid="manual-steps"
      data-sequence={sequence.id}
      sx={
        pinned
          ? {
              '& li[data-manual-step]': {
                cursor: 'pointer',
                borderRadius: 1,
                px: 1,
                py: 0.25,
                transition: 'background-color 120ms',
              },
              '& li[data-active="true"]': {
                bgcolor: 'action.selected',
                boxShadow: (theme) =>
                  `inset 3px 0 0 ${theme.palette.primary.main}`,
              },
            }
          : undefined
      }
    >
      {withFrames}
      {target === null
        ? null
        : createPortal(
            <StepsPanel
              sequence={sequence}
              step={step}
              stepCount={stepCount}
              onStep={choose}
            />,
            target,
          )}
    </Box>
  )
}
