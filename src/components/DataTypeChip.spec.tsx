import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../models/TableModel/ValueTypeName'
import { DataTypeChip } from './DataTypeChip'

describe('DataTypeChip (CW-562)', () => {
  it('renders the readable label as a chip by default', () => {
    render(<DataTypeChip type={ValueTypeName.ListString} showTooltip={false} />)
    expect(screen.getByText('List of strings')).toBeTruthy()
    expect(screen.getByTestId('data-type-chip-list_of_string')).toBeTruthy()
  })

  it('renders the compact abbreviation in abbreviation variant', () => {
    render(
      <DataTypeChip
        type={ValueTypeName.ListString}
        variant="abbreviation"
        showTooltip={false}
      />,
    )
    expect(screen.getByText('[str]')).toBeTruthy()
  })

  it('renders plain text in text variant', () => {
    render(
      <DataTypeChip
        type={ValueTypeName.Double}
        variant="text"
        showTooltip={false}
      />,
    )
    expect(screen.getByText('Double')).toBeTruthy()
  })

  it('never renders the raw enum wire format', () => {
    render(<DataTypeChip type={ValueTypeName.ListDouble} showTooltip={false} />)
    expect(screen.queryByText('list_of_double')).toBeNull()
    expect(screen.getByText('List of floating point numbers')).toBeTruthy()
  })
})
