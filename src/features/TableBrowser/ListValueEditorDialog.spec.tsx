import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import { ListValueEditorDialog } from './ListValueEditorDialog'

describe('ListValueEditorDialog (CW-563)', () => {
  const setup = (
    props: Partial<React.ComponentProps<typeof ListValueEditorDialog>> = {},
  ): {
    onSave: ReturnType<typeof vi.fn>
    onCancel: ReturnType<typeof vi.fn>
  } => {
    const onSave = vi.fn()
    const onCancel = vi.fn()
    render(
      <ListValueEditorDialog
        open={true}
        columnName="author"
        listType={ValueTypeName.ListString}
        value={['alice', 'bob']}
        onSave={onSave}
        onCancel={onCancel}
        {...props}
      />,
    )
    return { onSave, onCancel }
  }

  it('renders one input row per existing list element', () => {
    setup()
    expect(
      (screen.getByTestId('list-item-input-0') as HTMLInputElement).value,
    ).toBe('alice')
    expect(
      (screen.getByTestId('list-item-input-1') as HTMLInputElement).value,
    ).toBe('bob')
  })

  it('saves the edited list as a proper array (not a single joined element)', () => {
    const { onSave } = setup()
    fireEvent.change(screen.getByTestId('list-item-input-1'), {
      target: { value: 'carol' },
    })
    fireEvent.click(screen.getByTestId('list-value-editor-save'))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(['alice', 'carol'])
  })

  it('adds a new item row and includes it on save', () => {
    const { onSave } = setup()
    fireEvent.click(screen.getByTestId('list-value-editor-add'))
    fireEvent.change(screen.getByTestId('list-item-input-2'), {
      target: { value: 'dave' },
    })
    fireEvent.click(screen.getByTestId('list-value-editor-save'))
    expect(onSave).toHaveBeenCalledWith(['alice', 'bob', 'dave'])
  })

  it('removes an item row and excludes it on save', () => {
    const { onSave } = setup()
    fireEvent.click(screen.getByLabelText('remove item 0'))
    fireEvent.click(screen.getByTestId('list-value-editor-save'))
    expect(onSave).toHaveBeenCalledWith(['bob'])
  })

  it('coerces numeric list elements on save', () => {
    const { onSave } = setup({
      listType: ValueTypeName.ListLong,
      value: [1, 2],
    })
    fireEvent.change(screen.getByTestId('list-item-input-1'), {
      target: { value: '5' },
    })
    fireEvent.click(screen.getByTestId('list-value-editor-save'))
    expect(onSave).toHaveBeenCalledWith([1, 5])
  })

  it('blocks save for an invalid element (non-integer in an integer list)', () => {
    const { onSave } = setup({
      listType: ValueTypeName.ListInteger,
      value: [1],
    })
    fireEvent.change(screen.getByTestId('list-item-input-0'), {
      target: { value: '2.5' },
    })
    fireEvent.click(screen.getByTestId('list-value-editor-save'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('pastes items (replace) and saves them as the list value', () => {
    const { onSave } = setup({ value: ['alice'] })
    fireEvent.click(screen.getByRole('tab', { name: 'Paste' }))
    fireEvent.change(screen.getByTestId('list-paste-textarea'), {
      target: { value: 'x\ny\nz' },
    })
    fireEvent.click(screen.getByTestId('list-value-editor-replace'))
    expect(onSave).toHaveBeenCalledWith(['x', 'y', 'z'])
  })

  it('pastes items (append) onto existing rows and saves them as the list value', () => {
    const { onSave } = setup({ value: ['alice'] })
    fireEvent.click(screen.getByRole('tab', { name: 'Paste' }))
    fireEvent.change(screen.getByTestId('list-paste-textarea'), {
      target: { value: 'bob\ncarol' },
    })
    fireEvent.click(screen.getByTestId('list-value-editor-append'))
    expect(onSave).toHaveBeenCalledWith(['alice', 'bob', 'carol'])
  })

  it('opens on the Manual tab when the cell already has items', () => {
    setup({ value: ['alice', 'bob'] })
    expect(
      screen.getByRole('tab', { name: 'Manual' }).getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('opens on the Paste tab when the cell is empty', () => {
    setup({ value: [] })
    expect(
      screen.getByRole('tab', { name: 'Paste' }).getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('calls onCancel without saving', () => {
    const { onSave, onCancel } = setup()
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })
})
