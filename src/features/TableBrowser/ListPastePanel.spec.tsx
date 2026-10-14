import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import { ListPastePanel } from './ListPastePanel'

describe('ListPastePanel (CW-563 paste)', () => {
  const setup = (
    listType: ValueTypeName = ValueTypeName.ListString,
  ): {
    onParsedItemsChange: ReturnType<typeof vi.fn>
  } => {
    const onParsedItemsChange = vi.fn()
    render(
      <ListPastePanel
        listType={listType}
        onParsedItemsChange={onParsedItemsChange}
      />,
    )
    return { onParsedItemsChange }
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

  it('fires onParsedItemsChange when valid text is pasted', () => {
    const { onParsedItemsChange } = setup()
    paste('alice\nbob')
    expect(onParsedItemsChange).toHaveBeenCalledWith(['alice', 'bob'])
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

  it('flags invalid values for a numeric list', () => {
    setup(ValueTypeName.ListLong)
    paste('1\n2\nnope')
    expect(screen.getByTestId('list-paste-count').textContent).toContain(
      'invalid',
    )
  })
})
