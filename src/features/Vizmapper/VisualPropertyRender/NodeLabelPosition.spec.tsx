import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_NODE_LABEL_POSITION } from '../../../models/VisualStyleModel/impl/defaultVisualStyle'

import {
  isValidOffset,
  NodeLabelPositionPicker,
  parseOffset,
} from './NodeLabelPosition'

describe('parseOffset', () => {
  it('keeps the full value of decimals and exponents', () => {
    // parseInt truncated these to 1, storing an offset the user never typed.
    expect(parseOffset('1.5')).toBe(1.5)
    expect(parseOffset('-0.25')).toBe(-0.25)
    expect(parseOffset('1e3')).toBe(1000)
  })

  it('rejects an empty or incomplete draft', () => {
    expect(parseOffset('')).toBeUndefined()
    expect(parseOffset('  ')).toBeUndefined()
    expect(parseOffset('-')).toBeUndefined()
    expect(parseOffset('1.2.3')).toBeUndefined()
    expect(isValidOffset('')).toBe(false)
    expect(isValidOffset('1.5')).toBe(true)
  })
})

describe('NodeLabelPositionPicker offsets', () => {
  const renderPicker = () => {
    const onValueChange = vi.fn()
    render(
      <NodeLabelPositionPicker
        currentValue={DEFAULT_NODE_LABEL_POSITION}
        onValueChange={onValueChange}
        closePopover={vi.fn()}
      />,
    )
    return {
      onValueChange,
      x: screen.getByLabelText('Label X offset'),
      y: screen.getByLabelText('Label Y offset'),
      confirm: screen.getByRole('button', { name: 'Confirm' }),
    }
  }

  it('confirms a decimal offset without truncating it', () => {
    const { onValueChange, x, confirm } = renderPicker()

    fireEvent.change(x, { target: { value: '1.5' } })
    fireEvent.click(confirm)

    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ MARGIN_X: 1.5 }),
    )
  })

  it('confirms an exponent offset at its full value', () => {
    const { onValueChange, y, confirm } = renderPicker()

    fireEvent.change(y, { target: { value: '1e3' } })
    fireEvent.click(confirm)

    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ MARGIN_Y: 1000 }),
    )
  })

  it('disables Confirm while an offset field is empty', () => {
    const { onValueChange, x, confirm } = renderPicker()

    fireEvent.change(x, { target: { value: '' } })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(confirm)
    expect(onValueChange).not.toHaveBeenCalled()

    fireEvent.change(x, { target: { value: '12' } })
    expect((confirm as HTMLButtonElement).disabled).toBe(false)
  })
})
