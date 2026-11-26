import { DataEditorRef, GridSelection } from '@glideapps/glide-data-grid'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { TableContextMenu, TableContextMenuProps } from './TableContextMenu'

// The menu only renders its items; none of these are exercised by Copy Selected.
const renderMenu = (emit: DataEditorRef['emit']): void => {
  const activeEditorRef = {
    current: { emit } as unknown as DataEditorRef,
  }
  const props: TableContextMenuProps = {
    contextMenu: { cell: [0, 0], anchorPosition: { top: 0, left: 0 } },
    handleContextMenuClose: vi.fn(),
    isContextCellVirtual: false,
    isSelectionEmpty: false,
    currentTableIsNodeTable: true,
    activeEditorRef,
    rows: [],
    allColumns: [],
    currentTable: undefined,
    nodeTable: undefined,
    currentNetworkId: 'net',
    postEdit: vi.fn(),
    applyValueToElements: vi.fn(),
    exclusiveSelect: vi.fn(),
    selection: {} as GridSelection,
    setSelection: vi.fn(),
    selectedElementIds: [],
  }
  render(<TableContextMenu {...props} />)
}

const setClipboard = (clipboard: unknown): void => {
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  })
}

/**
 * Issue #994: "Copy Selected" goes through the grid's own copy, which fires the
 * clipboard write without awaiting it. A failed copy must still tell the user.
 */
describe('TableContextMenu Copy Selected', () => {
  beforeEach(() => {
    useMessageStore.getState().resetMessages()
  })

  it('shows an error when the clipboard is unavailable', async () => {
    setClipboard(undefined)
    renderMenu(vi.fn().mockResolvedValue(undefined))

    fireEvent.click(screen.getByTestId('context-menu-copy-selected'))

    await waitFor(() =>
      expect(useMessageStore.getState().messages.at(-1)).toMatchObject({
        message: 'Could not copy the selected cells to the clipboard.',
        severity: MessageSeverity.ERROR,
      }),
    )
  })

  it('shows an error when the grid write is refused', async () => {
    const write = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    setClipboard({ write })
    // Mirrors glide: the write is started and its promise discarded.
    const emit = vi.fn(async () => {
      void navigator.clipboard.write([])
    })
    renderMenu(emit)

    fireEvent.click(screen.getByTestId('context-menu-copy-selected'))

    await waitFor(() =>
      expect(useMessageStore.getState().messages.at(-1)?.severity).toBe(
        MessageSeverity.ERROR,
      ),
    )
    expect(emit).toHaveBeenCalledWith('copy')
  })

  it('shows no error when the copy succeeds', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    setClipboard({ write })
    const emit = vi.fn(async () => {
      void navigator.clipboard.write([])
    })
    renderMenu(emit)

    fireEvent.click(screen.getByTestId('context-menu-copy-selected'))

    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    expect(useMessageStore.getState().messages).toHaveLength(0)
  })
})
