// src/features/ToolBar/DataMenu/LoadFromNdexDialog.spec.tsx
//
// The initialQuery path used by the network search bar's NDEx provider:
// opening with a query prefills the search field and runs the search
// immediately; opening without one keeps the browse-mode listing.
// Also the search itself: one v3 search call with no visibility filter,
// which NDEx answers with public and private results in one ranked list.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  fetchNdexUserName: vi.fn(async () => 'me-on-ndex'),
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
    // mockReset, not mockClear: a test that fails early must not leave
    // queued mockResolvedValueOnce values for the next one.
    vi.mocked(searchNdexFiles)
      .mockReset()
      .mockResolvedValue({ files: [], numFound: 0 })
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
  // The Keycloak username (`tokenParsed.preferred_username`, 'me' here) is not
  // the NDEx account name, so filtering on it returned nothing.
  it('re-runs the search filtered to the NDEx account name when Only mine is checked', async () => {
    renderSignedIn('BRCA1')
    await waitFor(() => expect(searchNdexFiles).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByText('Only mine'))

    await waitFor(() => expect(searchNdexFiles).toHaveBeenCalledTimes(2))
    expect(vi.mocked(searchNdexFiles).mock.calls[1]).toEqual([
      'BRCA1',
      undefined,
      'token',
      'me-on-ndex',
      0,
      500,
      expect.anything(),
    ])
  })
  it('keeps the newer results when an older search resolves last', async () => {
    let resolveFirst: (value: any) => void = () => {}
    vi.mocked(searchNdexFiles)
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = resolve)),
      )
      .mockResolvedValueOnce({
        files: [
          {
            uuid: 'mine-1',
            name: 'My network',
            type: 'NETWORK',
            modificationTime: 0,
            visibility: 'PRIVATE',
          },
        ],
        numFound: 1,
      })

    renderSignedIn('BRCA1')
    await waitFor(() => expect(searchNdexFiles).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByText('Only mine'))
    expect(await screen.findByText('My network')).toBeTruthy()

    await act(async () => {
      resolveFirst({
        files: [
          {
            uuid: 'stale-1',
            name: 'Stale network',
            type: 'NETWORK',
            modificationTime: 0,
            visibility: 'PUBLIC',
          },
        ],
        numFound: 1,
      })
    })

    expect(screen.queryByText('Stale network')).toBeNull()
    expect(screen.getByText('My network')).toBeTruthy()
  })
  it('loads the next page of the same search and appends it', async () => {
    const network = (uuid: string, name: string) => ({
      uuid,
      name,
      type: 'NETWORK' as const,
      modificationTime: 0,
      visibility: 'PUBLIC',
    })
    vi.mocked(searchNdexFiles)
      .mockResolvedValueOnce({
        files: [network('n-1', 'First page network')],
        numFound: 501,
      })
      .mockResolvedValueOnce({
        files: [network('n-2', 'Second page network')],
        numFound: 501,
      })

    renderSignedIn('BRCA1')
    fireEvent.click(await screen.findByTestId('load-from-ndex-load-more'))

    expect(await screen.findByText('Second page network')).toBeTruthy()
    expect(screen.getByText('First page network')).toBeTruthy()
    expect(vi.mocked(searchNdexFiles).mock.calls[1]).toEqual([
      'BRCA1',
      undefined,
      'token',
      undefined,
      500,
      500,
      expect.anything(),
    ])
    // 500 + 1 of 501 fetched: nothing left to load
    expect(screen.queryByTestId('load-from-ndex-load-more')).toBeNull()
  })

  it('hides Load more when the first page holds every result', async () => {
    vi.mocked(searchNdexFiles).mockResolvedValueOnce({
      files: [
        {
          uuid: 'n-1',
          name: 'Only network',
          type: 'NETWORK',
          modificationTime: 0,
          visibility: 'PUBLIC',
        },
      ],
      numFound: 1,
    })

    renderSignedIn('BRCA1')

    expect(await screen.findByText('Only network')).toBeTruthy()
    expect(screen.queryByTestId('load-from-ndex-load-more')).toBeNull()
  })
})
