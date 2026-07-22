import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ListValueEditorDialog } from './ListValueEditorDialog'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'

describe('ListValueEditorDialog paste tab save', () => {
  it('should save pasted items if Save is clicked from Paste tab', () => {
    const onSave = vi.fn()
    render(
      <ListValueEditorDialog
        open={true}
        columnName="test_col"
        listType={ValueTypeName.ListString}
        value={null}
        onCancel={() => {}}
        onSave={onSave}
      />
    )
    
    // Type into paste panel
    const textarea = screen.getByTestId('list-paste-textarea')
    fireEvent.change(textarea, { target: { value: 'A, B, C' } })
    
    // Click Save
    const saveButton = screen.getByTestId('list-value-editor-save')
    fireEvent.click(saveButton)
    
    expect(onSave).toHaveBeenCalledWith(['A', 'B', 'C'])
  })
})
