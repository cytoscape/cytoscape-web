import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTableStore } from '@/data/hooks/stores/TableStore'
import { IdType } from '@/models/IdType'
import { Column, ValueTypeName } from '@/models/TableModel'
import {
  NodeVisualPropertyName,
  VisualProperty,
  VisualPropertyValueType,
  VisualPropertyValueTypeName,
} from '@/models/VisualStyleModel'
import { MappingFunctionType } from '@/models/VisualStyleModel/VisualMappingFunction'
import { VisualPropertyGroup } from '@/models/VisualStyleModel/VisualPropertyGroup'
import { MappingForm } from '.'

vi.mock('@/data/hooks/useUndoStack', () => ({
  useUndoStack: () => ({ postEdit: vi.fn() }),
}))

const NETWORK_ID: IdType = 'mapping-form-network'

const nodeColumns: Column[] = [
  { name: 'FillColor', type: ValueTypeName.String },
  { name: 'degree', type: ValueTypeName.Integer },
]

const fillColor = (
  attribute: string,
): VisualProperty<VisualPropertyValueType> =>
  ({
    name: NodeVisualPropertyName.NodeBackgroundColor,
    group: VisualPropertyGroup.Node,
    type: VisualPropertyValueTypeName.Color,
    displayName: 'Fill Color',
    defaultValue: '#FFFFFF',
    mapping: {
      type: MappingFunctionType.Passthrough,
      attribute,
      visualPropertyType: VisualPropertyValueTypeName.Color,
      defaultValue: '#FFFFFF',
    },
  }) as VisualProperty<VisualPropertyValueType>

const openForm = (vp: VisualProperty<VisualPropertyValueType>): void => {
  render(<MappingForm currentNetworkId={NETWORK_ID} visualProperty={vp} />)
  fireEvent.click(screen.getByTestId('mapping-form-view-box'))
}

// An option's accessible name is its tooltip text, so find it by value.
const option = (value: string): HTMLElement => {
  const found = screen
    .getAllByRole('option', { hidden: true })
    .find((o) => o.dataset.value === value)
  if (found === undefined) throw new Error(`no option ${value}`)
  return found
}

const shownValue = (testId: string): string =>
  within(screen.getByTestId(testId)).getByRole('combobox', { hidden: true })
    .textContent ?? ''

describe('MappingForm on an existing mapping', () => {
  beforeEach(() => {
    act(() => {
      useTableStore.setState({
        tables: {
          [NETWORK_ID]: {
            nodeTable: {
              id: NETWORK_ID,
              columns: nodeColumns,
              rows: new Map(),
            },
            edgeTable: { id: NETWORK_ID, columns: [], rows: new Map() },
          },
        },
      } as any)
    })
  })

  it('shows a string-to-color passthrough (#831)', () => {
    openForm(fillColor('FillColor'))

    expect(shownValue('mapping-form-column-select')).toBe('FillColor')
    expect(shownValue('mapping-form-type-select')).toBe('passthrough')
  })

  // A new passthrough from an integer column onto a color is not offered, but
  // a CX2 file can still carry one. The form must show it, not open blank.
  it('shows a mapping the form would not offer for a new one (#831)', () => {
    openForm(fillColor('degree'))

    expect(shownValue('mapping-form-column-select')).toBe('degree')
    expect(shownValue('mapping-form-type-select')).toBe('passthrough')
  })

  it('disables a column the mapping type rejects, and ignores a click on it', () => {
    openForm(fillColor('FillColor'))
    fireEvent.mouseDown(
      within(screen.getByTestId('mapping-form-column-select')).getByRole(
        'combobox',
      ),
    )
    const degree = option('degree')
    expect(degree.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(within(degree).getByText('degree'))

    expect(shownValue('mapping-form-column-select')).toBe('FillColor')
  })

  it('keeps the current column enabled when it would be rejected', () => {
    openForm(fillColor('degree'))
    fireEvent.mouseDown(
      within(screen.getByTestId('mapping-form-column-select')).getByRole(
        'combobox',
      ),
    )

    expect(option('degree').getAttribute('aria-disabled')).toBeNull()
  })
})
