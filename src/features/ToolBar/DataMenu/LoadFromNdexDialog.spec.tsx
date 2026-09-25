// src/features/ToolBar/DataMenu/LoadFromNdexDialog.spec.tsx
//
// The initialQuery path used by the network search bar's NDEx provider:
// opening with a query prefills the search field and runs the search
// immediately; opening without one keeps the browse-mode listing.
// Also the search itself: one v3 search call with no visibility filter,
// which NDEx answers with public and private results in one ranked list.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Keycloak from 'keycloak-js'

import { KeycloakContext } from '@/boot/keycloak'
import { searchNdexFiles } from '@/data/external-api/ndex'
import { useCredentialStore } from '@/data/hooks/stores/CredentialStore'
import { LoadFromNdexDialog } from './LoadFromNdexDialog'

vi.mock('@/data/external-api/ndex', () => ({
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

const renderSignedIn = (initialQuery?: string): void => {
  const client = {
    authenticated: true,
    tokenParsed: { preferred_username: 'me' },
  } as unknown as Keycloak
  render(
    <KeycloakContext.Provider value={client}>
      <MemoryRouter>
        <LoadFromNdexDialog
          open={true}
          handleClose={vi.fn()}
          initialQuery={initialQuery}
        />
      </MemoryRouter>
    </KeycloakContext.Provider>,
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
        undefined,
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
        undefined,
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

describe('LoadFromNdexDialog search', () => {
  beforeEach(() => {
    vi.mocked(searchNdexFiles).mockClear()
    useCredentialStore.setState({ getToken: vi.fn(async () => 'token') })
  })

  it('sends one search with no visibility filter when signed in', async () => {
    renderSignedIn('BRCA1')

    await waitFor(() => {
      expect(searchNdexFiles).toHaveBeenCalledWith(
        'BRCA1',
        undefined,
        'token',
        undefined,
        0,
        500,
        expect.anything(),
      )
    })
    expect(searchNdexFiles).toHaveBeenCalledTimes(1)
  })

  it('shows public and private results in one list with no tabs', async () => {
    vi.mocked(searchNdexFiles).mockResolvedValueOnce({
      files: [
        {
          uuid: 'pub-1',
          name: 'Public network',
          type: 'NETWORK',
          modificationTime: 0,
          visibility: 'PUBLIC',
        },
        {
          uuid: 'priv-1',
          name: 'Private network',
          type: 'NETWORK',
          modificationTime: 0,
          visibility: 'PRIVATE',
        },
      ],
      numFound: 2,
    })

    renderSignedIn('net')

    expect(await screen.findByText('Public network')).toBeTruthy()
    expect(screen.getByText('Private network')).toBeTruthy()
    expect(screen.queryByTestId('load-from-ndex-tabs')).toBeNull()
    expect(screen.queryByText(/unlisted/i)).toBeNull()
  })
  it('re-runs the search filtered to the owner when Only mine is checked', async () => {
    renderSignedIn('BRCA1')
    await waitFor(() => expect(searchNdexFiles).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByText('Only mine'))

    await waitFor(() => expect(searchNdexFiles).toHaveBeenCalledTimes(2))
    expect(vi.mocked(searchNdexFiles).mock.calls[1]).toEqual([
      'BRCA1',
      undefined,
      'token',
      'me',
      0,
      500,
      expect.anything(),
    ])
  })
})
