// src/features/ToolBar/LayoutMenu/ValueEditor/ValueEditor.spec.tsx
//
// The Layout Option Editor labels each parameter with its record key unless
// the property carries a human-readable `displayName` (#736). The editors
// take that label as an optional prop and fall back to `optionName`; the
// identity (`optionName`, the data-testids, the setValue argument) never
// changes, because `setLayoutOption` keys on it.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ValueTypeName } from '@/models/TableModel'
import { ValueEditor } from './ValueEditor'

const cases: Array<{
  valueType: ValueTypeName
  value: number | string | boolean | string[]
  testId: string
}> = [
  { valueType: ValueTypeName.Integer, value: 60, testId: 'number' },
  { valueType: ValueTypeName.String, value: 'x', testId: 'string' },
  { valueType: ValueTypeName.Boolean, value: true, testId: 'boolean' },
  { valueType: ValueTypeName.ListString, value: ['a'], testId: 'list' },
]

describe('ValueEditor labels', () => {
  it.each(cases)(
    '$valueType editor shows the display label but keeps the key as identity',
    ({ valueType, value, testId }) => {
      const setValue = vi.fn()
      render(
        <ValueEditor
          optionName="spacingFactor"
          label="Spacing Factor"
          description="Gap"
          valueType={valueType}
          value={value}
          setValue={setValue}
        />,
      )
      expect(screen.getByText('Spacing Factor')).toBeTruthy()
      expect(screen.queryByText('spacingFactor')).toBeNull()
      expect(
        screen.getByTestId(`layout-value-editor-${testId}-spacingFactor`),
      ).toBeTruthy()
    },
  )

  it.each(cases)(
    '$valueType editor falls back to the key when no label is given',
    ({ valueType, value }) => {
      render(
        <ValueEditor
          optionName="spacingFactor"
          description="Gap"
          valueType={valueType}
          value={value}
          setValue={vi.fn()}
        />,
      )
      expect(screen.getByText('spacingFactor')).toBeTruthy()
    },
  )

  it('table layout also shows the display label', () => {
    render(
      <ValueEditor
        optionName="spacingFactor"
        label="Spacing Factor"
        description="Gap"
        valueType={ValueTypeName.Integer}
        value={60}
        setValue={vi.fn()}
        tableLayout
      />,
    )
    expect(screen.getByText('Spacing Factor')).toBeTruthy()
    expect(screen.queryByText('spacingFactor')).toBeNull()
  })

  it('reports edits under the key, not the label', () => {
    const setValue = vi.fn()
    render(
      <ValueEditor
        optionName="spacingFactor"
        label="Spacing Factor"
        description="Gap"
        valueType={ValueTypeName.Boolean}
        value={false}
        setValue={setValue}
      />,
    )
    fireEvent.click(
      within(
        screen.getByTestId('layout-value-editor-boolean-spacingFactor'),
      ).getByRole('checkbox'),
    )
    expect(setValue).toHaveBeenCalledWith('spacingFactor', true)
  })
})
