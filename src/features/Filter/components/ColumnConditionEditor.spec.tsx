import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  ColumnFilterNode,
  FilterPredicate,
} from '@/models/FilterModel/FilterTree'
import { createColumnFilter } from '@/models/FilterModel/impl/filterTreeImpl'
import type { Table } from '@/models/TableModel'

import { ColumnConditionEditor } from './ColumnConditionEditor'

const nodeTable: Table = {
  id: 'net',
  columns: [{ name: 'score', type: 'double' }],
  rows: new Map([
    ['n1', { score: 1 }],
    ['n2', { score: 9 }],
  ]),
}
const edgeTable: Table = { id: 'net', columns: [], rows: new Map() }

const scoreCondition = (
  predicate: FilterPredicate,
  criterion: ColumnFilterNode['criterion'],
): ColumnFilterNode => ({
  ...createColumnFilter(),
  columnName: 'score',
  predicate,
  criterion,
})

const renderEditor = (node: ColumnFilterNode) => {
  const onChange = vi.fn()
  render(
    <ColumnConditionEditor
      node={node}
      nodeTable={nodeTable}
      edgeTable={edgeTable}
      testId="c"
      onChange={onChange}
    />,
  )
  return onChange
}

const openPredicateOptions = (): string[] => {
  const input = screen.getByTestId('c-predicate')
  fireEvent.mouseDown(
    within(input.parentElement as HTMLElement).getByRole('combobox'),
  )
  return screen.getAllByRole('option').map((option) => option.textContent ?? '')
}

describe('ColumnConditionEditor: numeric columns', () => {
  it('offers only "is" and "is not" a range, as Cytoscape Desktop does', () => {
    renderEditor(scoreCondition(FilterPredicate.BETWEEN, [1, 9]))

    expect(screen.getByTestId('c-range')).toBeTruthy()
    expect(openPredicateOptions()).toEqual(['is', 'is not'])
  })

  it('shows an imported single-value condition as it is', () => {
    renderEditor(scoreCondition(FilterPredicate.GREATER_THAN, 3))

    expect((screen.getByTestId('c-value') as HTMLInputElement).value).toBe('3')
    expect(openPredicateOptions()).toEqual(['is', 'is not', 'is greater than'])
  })

  it('turns an imported single-value condition into the matching range', () => {
    const onChange = renderEditor(
      scoreCondition(FilterPredicate.GREATER_THAN_OR_EQUAL, 3),
    )

    openPredicateOptions()
    fireEvent.click(screen.getByRole('option', { name: 'is' }))

    expect(onChange).toHaveBeenCalledWith(
      scoreCondition(FilterPredicate.BETWEEN, [3, 9]),
    )
  })
})
