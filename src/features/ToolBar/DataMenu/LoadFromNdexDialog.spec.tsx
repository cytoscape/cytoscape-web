// src/features/ToolBar/DataMenu/LoadFromNdexDialog.spec.tsx
//
// The initialQuery path used by the network search bar's NDEx provider:
// opening with a query prefills the search field and runs the search
// immediately; opening without one keeps the browse-mode listing.

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { searchNdexFiles } from '../../../data/external-api/ndex'
import { LoadFromNdexDialog } from './LoadFromNdexDialog'

vi.mock('../../../data/external-api/ndex', () => ({
  searchNdexFiles: vi.fn(async () => ({ files: [], numFound: 0 })),
  fetchNdexSummaries: vi.fn(async () => []),
  fetchFolderContents: vi.fn(async () => []),
  fetchFolderInfo: vi.fn(async () => ({ name: 'folder' })),
  enrichShortcutsWithTargetSummaries: vi.fn(async (items: unknown[]) => items),
  getNetworkIdForFileItem: vi.fn((item: { uuid: string }) => item.uuid),
}))

const renderDialog = (initialQuery?: string): void => {
  render(
    <MemoryRouter>
      <LoadFromNdexDialog
        open={true}
        handleClose={vi.fn()}
        initialQuery={initialQuery}
      />
    </MemoryRouter>,
  )
}

describe('LoadFromNdexDialog initialQuery', () => {
  beforeEach(() => {
    vi.mocked(searchNdexFiles).mockClear()
  })

  it('runs the initial query as soon as the dialog opens', async () => {
    renderDialog('BRCA1')

    await waitFor(() => {
      expect(searchNdexFiles).toHaveBeenCalledWith(
        'BRCA1',
        'PUBLIC',
        undefined,
        undefined,
        0,
        500,
        expect.anything(),
      )
    })
  })

  it('prefills the search field with the initial query', () => {
    renderDialog('BRCA1')

    const input = screen
      .getByTestId('load-from-ndex-search-input')
      .querySelector('input')
    expect(input?.value).toBe('BRCA1')
  })

  it('opens in browse mode when no initial query is given', async () => {
    renderDialog()

    await waitFor(() => {
      expect(searchNdexFiles).toHaveBeenCalledWith(
        '',
        'PUBLIC',
        undefined,
        undefined,
        0,
        500,
        expect.anything(),
      )
    })
    const input = screen
      .getByTestId('load-from-ndex-search-input')
      .querySelector('input')
    expect(input?.value).toBe('')
  })
})
