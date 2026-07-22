import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../models/TableModel/ValueTypeName'
import { ValueTypeNameChip } from './ValueTypeNameChip'

describe('ValueTypeNameChip (CW-562)', () => {
  it('renders the svg badge as a chip by default', () => {
    const { container } = render(<ValueTypeNameChip type={ValueTypeName.ListString} showTooltip={false} />)
    expect(screen.getByTestId('data-type-chip-list_of_string')).toBeTruthy()
    // It should contain an SVG
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders the svg badge in abbreviation variant', () => {
    const { container } = render(
      <ValueTypeNameChip
        type={ValueTypeName.ListString}
        variant="abbreviation"
        showTooltip={false}
      />,
    )
    expect(screen.getByTestId('data-type-chip-list_of_string')).toBeTruthy()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders plain text description in text variant', () => {
    render(
      <ValueTypeNameChip
        type={ValueTypeName.Double}
        variant="text"
        showTooltip={false}
      />,
    )
    expect(screen.getByText('Decimal number (double)')).toBeTruthy()
  })

  it('never renders the raw enum wire format', () => {
    render(<ValueTypeNameChip type={ValueTypeName.ListDouble} variant="text" showTooltip={false} />)
    expect(screen.queryByText('list_of_double')).toBeNull()
    expect(screen.getByText('List of decimals (comma-separated, e.g., "1.5, 2.7, 3.9")')).toBeTruthy()
  })
})

