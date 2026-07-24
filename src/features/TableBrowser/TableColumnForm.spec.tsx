import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import { CreateTableColumnForm } from './TableColumnForm'

describe('CreateTableColumnForm', () => {
  it('resets its state when reopened instead of when submitted', () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    const { rerender } = render(
      <CreateTableColumnForm open={true} onSubmit={onSubmit} onClose={onClose} />
    )

    // Initially the form should be empty
    expect((screen.getByTestId('create-table-column-name-input').querySelector('input') as HTMLInputElement).value).toBe('')

    // Type a column name
    fireEvent.change(screen.getByTestId('create-table-column-name-input').querySelector('input') as HTMLInputElement, {
      target: { value: 'newColumn' },
    })
    expect((screen.getByTestId('create-table-column-name-input').querySelector('input') as HTMLInputElement).value).toBe('newColumn')

    // Submit the form
    fireEvent.click(screen.getByTestId('create-table-column-confirm-button'))
    
    // Check that onSubmit was called
    expect(onSubmit).toHaveBeenCalledWith('newColumn', ValueTypeName.String, '')

    // The state should NOT be reset immediately (so if validation failed, the user's input remains)
    expect((screen.getByTestId('create-table-column-name-input').querySelector('input') as HTMLInputElement).value).toBe('newColumn')

    // Close the dialog and reopen it
    rerender(<CreateTableColumnForm open={false} onSubmit={onSubmit} onClose={onClose} />)
    rerender(<CreateTableColumnForm open={true} onSubmit={onSubmit} onClose={onClose} />)

    // The state should now be reset because the dialog was reopened
    expect((screen.getByTestId('create-table-column-name-input').querySelector('input') as HTMLInputElement).value).toBe('')
  })
})
