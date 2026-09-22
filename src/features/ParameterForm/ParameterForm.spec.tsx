// src/features/ParameterForm/ParameterForm.spec.tsx
//
// The shared parameter form: array order, fieldsets from `groups`, one
// control per UI type, typed onChange values, validation messages, column
// pickers from the network's tables (edges from the EDGE table), the key
// rule for colliding labels, host-filled types hidden.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useTableStore } from '@/data/hooks/stores/TableStore'
import type { AppParameter } from '@/models/AppModel/AppParameter'
import { computeParameterErrors } from './parameterErrors'
import { ParameterForm } from './ParameterForm'

vi.mock('@/data/hooks/stores/TableStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useTableStore: create(() => ({
      tables: {
        net1: {
          nodeTable: {
            columns: [
              { name: 'name', type: 'string' },
              { name: 'Zeta', type: 'string' },
              { name: 'score', type: 'double' },
              { name: 'alpha', type: 'string' },
              { name: 'degree', type: 'integer' },
            ],
          },
          edgeTable: {
            columns: [
              { name: 'interaction', type: 'string' },
              { name: 'weight', type: 'double' },
            ],
          },
        },
      },
    })),
  }
})

const text = (
  displayName: string,
  overrides: Partial<AppParameter> = {},
): AppParameter => ({ displayName, type: 'text', ...overrides })

const isBefore = (a: Element, b: Element): boolean =>
  (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

describe('ParameterForm', () => {
  it('renders fields in array order with the label and the default value', () => {
    render(
      <ParameterForm
        parameters={[
          text('Second', { defaultValue: 'b' }),
          text('First', { defaultValue: 'a' }),
        ]}
        values={{}}
        onChange={vi.fn()}
        testIdPrefix="t"
      />,
    )
    const second = screen.getByTestId('t-field-Second') as HTMLInputElement
    const first = screen.getByTestId('t-field-First') as HTMLInputElement
    expect(isBefore(second, first)).toBe(true)
    expect(second.value).toBe('b')
    expect(first.value).toBe('a')
    expect(screen.getByText('Second')).toBeTruthy()
  })

  it('nests fields into fieldsets by groups, keeping a group together', () => {
    render(
      <ParameterForm
        parameters={[
          text('Last name', { groups: ['Company', 'Department', 'Office'] }),
          text('First name', {
            groups: ['Company', 'Department', 'Office', 'Identity'],
          }),
          text('Top level'),
          text('Office name', { groups: ['Company', 'Department', 'Office'] }),
        ]}
        values={{}}
        onChange={vi.fn()}
        testIdPrefix="t"
      />,
    )
    const office = screen.getByTestId('t-group-Company/Department/Office')
    expect(office.tagName).toBe('FIELDSET')
    expect(
      within(office).getByText('Office', { selector: 'legend' }),
    ).toBeTruthy()
    const identity = screen.getByTestId(
      't-group-Company/Department/Office/Identity',
    )
    expect(office.contains(identity)).toBe(true)
    // Office name (4th in the array) renders inside Office, after Identity
    const officeName = screen.getByTestId('t-field-Office name')
    expect(office.contains(officeName)).toBe(true)
    expect(isBefore(identity, officeName)).toBe(true)
    // Top level stays outside every fieldset and after the Company group
    const topLevel = screen.getByTestId('t-field-Top level')
    expect(screen.getByTestId('t-group-Company').contains(topLevel)).toBe(false)
    expect(isBefore(office, topLevel)).toBe(true)
  })

  it('commits typed values: a whole number for digits, a boolean for checkBox, a string for dropDown', () => {
    const onChange = vi.fn()
    render(
      <ParameterForm
        parameters={[
          text('Gap', { validationType: 'digits', defaultValue: 60 }),
          { displayName: 'On', type: 'checkBox', defaultValue: false },
          {
            displayName: 'Mode',
            type: 'dropDown',
            valueList: ['a', 'b'],
            defaultValue: 'a',
          },
        ]}
        values={{}}
        onChange={onChange}
        testIdPrefix="t"
      />,
    )
    fireEvent.change(screen.getByTestId('t-field-Gap'), {
      target: { value: '75' },
    })
    expect(onChange).toHaveBeenLastCalledWith('Gap', 75)

    fireEvent.click(screen.getByTestId('t-field-On'))
    expect(onChange).toHaveBeenLastCalledWith('On', true)

    fireEvent.mouseDown(screen.getByTestId('t-field-Mode'))
    fireEvent.click(screen.getByRole('option', { name: 'b' }))
    expect(onChange).toHaveBeenLastCalledWith('Mode', 'b')
  })

  it('does not commit an invalid draft and shows the message meanwhile', () => {
    const onChange = vi.fn()
    render(
      <ParameterForm
        parameters={[
          text('Gap', {
            validationType: 'digits',
            defaultValue: 60,
            minValue: 1,
            maxValue: 100,
            validationHelp: 'Between 1 and 100',
          }),
        ]}
        values={{ Gap: 60 }}
        onChange={onChange}
        testIdPrefix="t"
      />,
    )
    const input = screen.getByTestId('t-field-Gap') as HTMLInputElement
    fireEvent.change(input, { target: { value: '1.5' } })
    expect(onChange).not.toHaveBeenCalled()
    expect(input.value).toBe('1.5') // the draft is kept
    expect(screen.getByText('Between 1 and 100')).toBeTruthy()

    fireEvent.change(input, { target: { value: '500' } })
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: '50' } })
    expect(onChange).toHaveBeenLastCalledWith('Gap', 50)
    expect(screen.queryByText('Between 1 and 100')).toBeNull()
  })

  it('renders a stored service-style "true" string as a checked box', () => {
    render(
      <ParameterForm
        parameters={[
          { displayName: 'On', type: 'checkBox', defaultValue: 'false' },
        ]}
        values={{ On: 'true' }}
        onChange={vi.fn()}
        testIdPrefix="t"
      />,
    )
    expect((screen.getByTestId('t-field-On') as HTMLInputElement).checked).toBe(
      true,
    )
  })

  it('offers node columns filtered by columnTypeFilter and edge columns from the edge table', () => {
    render(
      <ParameterForm
        parameters={[
          {
            displayName: 'Weight column',
            type: 'nodeColumn',
            columnTypeFilter: 'number',
          },
          { displayName: 'Edge column', type: 'edgeColumn' },
        ]}
        values={{}}
        onChange={vi.fn()}
        networkId="net1"
        testIdPrefix="t"
      />,
    )
    fireEvent.mouseDown(screen.getByTestId('t-field-Weight column'))
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      '(none)',
      'degree',
      'score',
    ])
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })

    fireEvent.mouseDown(screen.getByTestId('t-field-Edge column'))
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      '(none)',
      'interaction',
      'weight',
    ])
  })

  it('shows "(none)" for an unselected column, sorts columns case-insensitively, and can clear the choice', () => {
    const onChange = vi.fn()
    render(
      <ParameterForm
        parameters={[{ displayName: 'Col', type: 'nodeColumn' }]}
        values={{ Col: 'name' }}
        onChange={onChange}
        networkId="net1"
        testIdPrefix="t"
      />,
    )
    const display = screen.getByTestId('t-field-Col')
    expect(display.textContent).toBe('name')

    fireEvent.mouseDown(display)
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      '(none)',
      'alpha',
      'degree',
      'name',
      'score',
      'Zeta',
    ])
    fireEvent.click(screen.getByRole('option', { name: '(none)' }))
    expect(onChange).toHaveBeenLastCalledWith('Col', '')
  })

  it('displays "(none)" when no column is selected', () => {
    render(
      <ParameterForm
        parameters={[{ displayName: 'Col', type: 'nodeColumn' }]}
        values={{}}
        onChange={vi.fn()}
        networkId="net1"
        testIdPrefix="t"
      />,
    )
    expect(screen.getByTestId('t-field-Col').textContent).toBe('(none)')
  })

  it('keeps a stale column visible, marked, and reports it as an error', () => {
    const params: AppParameter[] = [{ displayName: 'Col', type: 'nodeColumn' }]
    render(
      <ParameterForm
        parameters={params}
        values={{ Col: 'gone' }}
        onChange={vi.fn()}
        networkId="net1"
        testIdPrefix="t"
      />,
    )
    expect(screen.getByTestId('t-field-Col').textContent).toContain(
      'gone (not in this network)',
    )
    expect(screen.getByText(/not in the current network/)).toBeTruthy()
    const columns = useTableStore.getState().tables.net1
    expect(
      computeParameterErrors(
        params,
        ['Col'],
        { Col: 'gone' },
        {
          nodeColumns: columns.nodeTable.columns as any,
          edgeColumns: columns.edgeTable.columns as any,
        },
      ),
    ).toEqual({ Col: "Column 'gone' is not in the current network" })
  })

  it('keys colliding labels by their group path and hides host-filled types', () => {
    const onChange = vi.fn()
    render(
      <ParameterForm
        parameters={[
          text('Gap', { groups: ['Nodes'], defaultValue: 'n' }),
          text('Gap', { groups: ['Clusters'], defaultValue: 'c' }),
          { displayName: 'Token', type: 'accessToken' },
          { displayName: 'Net', type: 'ndexUUID' },
        ]}
        values={{ 'Clusters/Gap': 'edited' }}
        onChange={onChange}
        testIdPrefix="t"
      />,
    )
    expect(
      (screen.getByTestId('t-field-Nodes/Gap') as HTMLInputElement).value,
    ).toBe('n')
    expect(
      (screen.getByTestId('t-field-Clusters/Gap') as HTMLInputElement).value,
    ).toBe('edited')
    expect(screen.queryByText('Token')).toBeNull()
    expect(screen.queryByText('Net')).toBeNull()
    fireEvent.change(screen.getByTestId('t-field-Nodes/Gap'), {
      target: { value: 'x' },
    })
    expect(onChange).toHaveBeenLastCalledWith('Nodes/Gap', 'x')
  })

  it('uses caller-provided keys (the Layout Settings engine keys)', () => {
    const onChange = vi.fn()
    render(
      <ParameterForm
        parameters={[
          text('Radius', { validationType: 'digits', defaultValue: 1 }),
        ]}
        keys={['radius']}
        values={{ radius: 1000 }}
        onChange={onChange}
        testIdPrefix="t"
      />,
    )
    const input = screen.getByTestId('t-field-radius') as HTMLInputElement
    expect(input.value).toBe('1000')
    fireEvent.change(input, { target: { value: '900' } })
    expect(onChange).toHaveBeenLastCalledWith('radius', 900)
  })

  it('renders radio groups', () => {
    const onChange = vi.fn()
    render(
      <ParameterForm
        parameters={[
          {
            displayName: 'Pick',
            type: 'radio',
            valueList: ['x', 'y'],
            defaultValue: 'x',
          },
        ]}
        values={{}}
        onChange={onChange}
        testIdPrefix="t"
      />,
    )
    fireEvent.click(screen.getByRole('radio', { name: 'y' }))
    expect(onChange).toHaveBeenLastCalledWith('Pick', 'y')
  })
})
