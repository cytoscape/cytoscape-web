import { Box, Slider, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

import type { NumberRange } from '@/models/PropertyModel/NumberRange'

import { roundForDisplay } from '../utils/filterTabUtil'

// A double slider has this many steps, as in Cytoscape Desktop
const DOUBLE_SLIDER_STEPS = 500

interface NumberFieldProps {
  value: number
  integer: boolean
  label: string
  testId: string
  onCommit: (value: number) => void
}

/**
 * A number field that commits only valid numbers. While the text does not
 * parse (an empty field, a lone "-"), the last valid value stays in effect.
 */
export const NumberField = ({
  value,
  integer,
  label,
  testId,
  onCommit,
}: NumberFieldProps): JSX.Element => {
  const [text, setText] = useState<string>(String(value))

  // Follow changes made elsewhere (the slider, another tab)
  useEffect(() => {
    setText((current) => (Number(current) === value ? current : String(value)))
  }, [value])

  return (
    <TextField
      size="small"
      variant="outlined"
      value={text}
      inputProps={{
        'aria-label': label,
        'data-testid': testId,
        inputMode: 'decimal',
      }}
      sx={{ width: '6em' }}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        const parsed = Number(next)
        if (next.trim() !== '' && Number.isFinite(parsed)) {
          onCommit(integer ? Math.round(parsed) : parsed)
        }
      }}
      onBlur={() => setText(String(value))}
    />
  )
}

interface RangeInputProps {
  value: readonly [number, number]
  // Slider bounds: the values in the column (or of the degrees)
  bounds: NumberRange
  integer: boolean
  testId: string
  onChange: (value: [number, number]) => void
}

/**
 * "between [low] and [high] inclusive", with a slider bounded by the values
 * present. The fields are authoritative and may go past the slider's bounds.
 */
export const RangeInput = ({
  value,
  bounds,
  integer,
  testId,
  onChange,
}: RangeInputProps): JSX.Element => {
  const [low, high] = value
  const { min, max } = bounds
  const clamp = (n: number): number => Math.min(max, Math.max(min, n))
  const step = integer ? 1 : (max - min) / DOUBLE_SLIDER_STEPS || 1

  return (
    <Box data-testid={testId} sx={{ width: '100%' }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
      >
        <Typography variant="body2">between</Typography>
        <NumberField
          value={low}
          integer={integer}
          label="Lower bound"
          testId={`${testId}-low`}
          onCommit={(next) => onChange([next, high])}
        />
        <Typography variant="body2">and</Typography>
        <NumberField
          value={high}
          integer={integer}
          label="Upper bound"
          testId={`${testId}-high`}
          onCommit={(next) => onChange([low, next])}
        />
        <Typography variant="body2">inclusive.</Typography>
      </Box>
      <Box sx={{ px: 1.5 }}>
        <Slider
          size="small"
          disabled={min === max}
          min={min}
          max={max}
          step={step}
          value={[clamp(low), clamp(high)]}
          getAriaLabel={(index) =>
            index === 0 ? 'Lower bound' : 'Upper bound'
          }
          onChange={(_event, next) => {
            const [nextLow, nextHigh] = next as number[]
            onChange(
              integer
                ? [nextLow, nextHigh]
                : [roundForDisplay(nextLow), roundForDisplay(nextHigh)],
            )
          }}
        />
      </Box>
    </Box>
  )
}
