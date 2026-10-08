import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '@/models/TableModel'
import { HeaderTooltipTarget } from '../hooks/useHeaderTooltip'
import {
  TableHeaderTooltip,
  TableHeaderTooltipColumn,
} from './TableHeaderTooltip'

const columns: TableHeaderTooltipColumn[] = [
  { title: 'CX ID', type: ValueTypeName.String, isVirtual: true },
  {
    title: 'a very long attribute name that gets clipped',
    type: ValueTypeName.ListDouble,
  },
]

const targetFor = (columnIndex: number): HeaderTooltipTarget => ({
  columnIndex,
  bounds: { x: 42, y: 64, width: 100, height: 32 },
})

describe('TableHeaderTooltip', () => {
  it('renders nothing while no header is hovered', () => {
    render(<TableHeaderTooltip target={null} columns={columns} />)

    expect(screen.queryByTestId('table-header-tooltip-content')).toBeNull()
  })

  it('shows the full column name and its data type', () => {
    render(<TableHeaderTooltip target={targetFor(1)} columns={columns} />)

    expect(
      screen.getByText('a very long attribute name that gets clipped'),
    ).toBeTruthy()
    expect(screen.getByTestId('data-type-chip-list_of_double')).toBeTruthy()
    expect(screen.getByText('List of floating point numbers')).toBeTruthy()
  })

  it('omits the data type for virtual columns', () => {
    render(<TableHeaderTooltip target={targetFor(0)} columns={columns} />)

    expect(screen.getByText('CX ID')).toBeTruthy()
    expect(screen.queryByTestId('data-type-chip-string')).toBeNull()
  })

  it('stays closed when the hovered index has no column', () => {
    render(<TableHeaderTooltip target={targetFor(99)} columns={columns} />)

    expect(screen.queryByTestId('table-header-tooltip-content')).toBeNull()
  })
})
