import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import { ListPastePanel } from './ListPastePanel'

describe('ListPastePanel (CW-563 paste)', () => {
  const setup = (
    listType: ValueTypeName = ValueTypeName.ListString,
    currentCount = 0,
  ): {
    onAppend: ReturnType<typeof vi.fn>
    onReplace: ReturnType<typeof vi.fn>
  } => {
    const onAppend = vi.fn()
    const onReplace = vi.fn()
    render(
      <ListPastePanel
        listType={listType}
        currentCount={currentCount}
        onAppend={onAppend}
        onReplace={onReplace}
      />,
    )
    return { onAppend, onReplace }
  }

  const paste = (text: string): void => {
    fireEvent.change(screen.getByTestId('list-paste-textarea'), {
      target: { value: text },
    })
  }

  it('shows nothing to preview until text is pasted', () => {
    setup()
    expect(screen.queryByTestId('list-paste-preview')).toBeNull()
  })

  it('previews the recognized item count for newline-separated text', () => {
    setup()
    paste('alice\nbob\ncarol')
    expect(screen.getByTestId('list-paste-count').textContent).toContain(
      '3 items recognized',
    )
  })

  it('appends parsed items and clears the textarea', () => {
    const { onAppend } = setup()
    paste('alice\nbob')
    fireEvent.click(screen.getByTestId('list-paste-append'))
    expect(onAppend).toHaveBeenCalledWith(['alice', 'bob'])
    expect(
      (screen.getByTestId('list-paste-textarea') as HTMLTextAreaElement).value,
    ).toBe('')
  })

  it('replaces with parsed items', () => {
    const { onReplace } = setup()
    paste('x\ny\nz')
    fireEvent.click(screen.getByTestId('list-paste-replace'))
    expect(onReplace).toHaveBeenCalledWith(['x', 'y', 'z'])
  })

  it('re-splits when the separator override changes', () => {
    setup()
    // Newline text: auto-detect picks newline -> 3 items
    paste('a\nb\nc')
    expect(screen.getByTestId('list-paste-count').textContent).toContain(
      '3 items recognized',
    )
    // Override to comma: no commas present -> the whole blob is 1 item
    fireEvent.change(screen.getByTestId('list-paste-separator-select'), {
      target: { value: 'comma' },
    })
    expect(screen.getByTestId('list-paste-count').textContent).toContain(
      '1 item recognized',
    )
  })

  it('labels Replace with the current count when the list is non-empty', () => {
    setup(ValueTypeName.ListString, 3)
    paste('x\ny')
    expect(screen.getByTestId('list-paste-replace').textContent).toBe(
      'Replace all (3)',
    )
  })

  it('labels Replace plainly when the list is empty', () => {
    setup(ValueTypeName.ListString, 0)
    paste('x\ny')
    expect(screen.getByTestId('list-paste-replace').textContent).toBe('Replace')
  })

  it('flags invalid values for a numeric list', () => {
    setup(ValueTypeName.ListLong)
    paste('1\n2\nnope')
    expect(screen.getByTestId('list-paste-count').textContent).toContain(
      'invalid',
    )
  })
})
