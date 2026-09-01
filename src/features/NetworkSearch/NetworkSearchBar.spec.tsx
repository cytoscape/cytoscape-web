// src/features/NetworkSearch/NetworkSearchBar.spec.tsx
//
// Bar behavior: hidden without providers, submit gating on non-empty text,
// Enter and button submission with the trimmed query, progress + failure
// message for async providers, options button visibility, provider menu
// selection and persistence.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppResourceStore } from '@/data/hooks/stores/AppResourceStore'
import { useAppStore } from '@/data/hooks/stores/AppStore'
import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { AppStatus } from '@/models/AppModel/AppStatus'
import type { RegisteredAppResource } from '@/models/AppModel/RegisteredAppResource'
import { NetworkSearchBar } from './NetworkSearchBar'
import { useNetworkSearchProviderSelectionStore } from './store/networkSearchProviderSelectionStore'

vi.mock('@/data/hooks/stores/AppStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useAppStore: create(() => ({
      apps: {} as Record<string, { status: AppStatus }>,
    })),
  }
})

function seedProvider(
  overrides: Partial<RegisteredAppResource> & { id: string },
): void {
  const resource: RegisteredAppResource = {
    appId: 'app1',
    slot: 'search-bar',
    title: overrides.id,
    onSubmit: vi.fn(),
    ...overrides,
  }
  useAppResourceStore.setState({
    resources: [...useAppResourceStore.getState().resources, resource],
  })
  useAppStore.setState({
    apps: {
      ...(useAppStore.getState() as any).apps,
      [resource.appId]: { status: AppStatus.Active },
    },
  } as any)
}

describe('NetworkSearchBar', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppResourceStore.setState({ resources: [] })
    useAppStore.setState({ apps: {} } as any)
    useMessageStore.setState({ messages: [] })
    useNetworkSearchProviderSelectionStore.setState({
      selectedProviderId: null,
    })
  })

  it('renders nothing when no provider is registered', () => {
    render(<NetworkSearchBar />)
    expect(screen.queryByTestId('network-search-bar')).toBeNull()
  })

  it('renders the bar once a provider is registered', () => {
    seedProvider({ id: 'S1', title: 'My Search' })
    render(<NetworkSearchBar />)
    expect(screen.getByTestId('network-search-bar')).toBeDefined()
    expect(screen.getByTestId('network-search-input')).toBeDefined()
  })

  it('uses the provider placeholder, falling back to the default', () => {
    seedProvider({ id: 'S1', placeholder: 'Enter gene names...' })
    render(<NetworkSearchBar />)
    expect(
      screen
        .getByTestId('network-search-input')
        .getAttribute('placeholder'),
    ).toBe('Enter gene names...')
  })

  it('disables the search button until the query is non-empty', () => {
    seedProvider({ id: 'S1' })
    render(<NetworkSearchBar />)

    const button = screen.getByTestId(
      'network-search-submit-button',
    ) as HTMLButtonElement
    expect(button.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('network-search-input'), {
      target: { value: 'BRCA1' },
    })
    expect(button.disabled).toBe(false)

    fireEvent.change(screen.getByTestId('network-search-input'), {
      target: { value: '   ' },
    })
    expect(button.disabled).toBe(true)
  })

  it('submits the trimmed query on button click', async () => {
    const onSubmit = vi.fn()
    seedProvider({ id: 'S1', onSubmit })
    render(<NetworkSearchBar />)

    fireEvent.change(screen.getByTestId('network-search-input'), {
      target: { value: '  BRCA1  ' },
    })
    fireEvent.click(screen.getByTestId('network-search-submit-button'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ query: 'BRCA1' })
    })
  })

  it('submits on Enter in the search field', async () => {
    const onSubmit = vi.fn()
    seedProvider({ id: 'S1', onSubmit })
    render(<NetworkSearchBar />)

    const input = screen.getByTestId('network-search-input')
    fireEvent.change(input, { target: { value: 'TP53' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ query: 'TP53' })
    })
  })

  it('does not submit an empty query on Enter', () => {
    const onSubmit = vi.fn()
    seedProvider({ id: 'S1', onSubmit })
    render(<NetworkSearchBar />)

    fireEvent.keyDown(screen.getByTestId('network-search-input'), {
      key: 'Enter',
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows progress and disables search while an async submit is pending', async () => {
    let resolveSearch: () => void = () => {}
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSearch = resolve
        }),
    )
    seedProvider({ id: 'S1', onSubmit })
    render(<NetworkSearchBar />)

    fireEvent.change(screen.getByTestId('network-search-input'), {
      target: { value: 'BRCA1' },
    })
    fireEvent.click(screen.getByTestId('network-search-submit-button'))

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeDefined()
    })
    expect(
      (screen.getByTestId('network-search-submit-button') as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    act(() => resolveSearch())
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).toBeNull()
    })
  })

  it('surfaces a rejected submit as an error message', async () => {
    const onSubmit = vi.fn(() => Promise.reject(new Error('backend down')))
    seedProvider({ id: 'S1', title: 'My Search', onSubmit })
    render(<NetworkSearchBar />)

    fireEvent.change(screen.getByTestId('network-search-input'), {
      target: { value: 'BRCA1' },
    })
    fireEvent.click(screen.getByTestId('network-search-submit-button'))

    await waitFor(() => {
      const { messages } = useMessageStore.getState()
      expect(messages.some((m) => m.message.includes('My Search'))).toBe(true)
    })
  })

  it('hides the options button when the provider has no optionsComponent', () => {
    seedProvider({ id: 'S1' })
    render(<NetworkSearchBar />)
    expect(screen.queryByTestId('network-search-options-button')).toBeNull()
  })

  it('opens the options popover and closes it via its Close button', async () => {
    const Options = (): JSX.Element => <div data-testid="app-options">opts</div>
    seedProvider({ id: 'S1', component: Options })
    render(<NetworkSearchBar />)

    fireEvent.click(screen.getByTestId('network-search-options-button'))
    expect(screen.getByTestId('app-options')).toBeDefined()

    fireEvent.click(screen.getByTestId('network-search-options-close-button'))
    // The popover unmounts after its close transition finishes.
    await waitFor(() => {
      expect(screen.queryByTestId('app-options')).toBeNull()
    })
  })

  it('selects a provider from the menu and persists the choice', () => {
    seedProvider({ id: 'S1', title: 'Alpha' })
    seedProvider({ id: 'S2', title: 'Zebra' })
    render(<NetworkSearchBar />)

    fireEvent.click(screen.getByTestId('network-search-provider-button'))
    fireEvent.click(
      screen.getByTestId('network-search-provider-item-app1-S2'),
    )

    expect(
      useNetworkSearchProviderSelectionStore.getState().selectedProviderId,
    ).toBe('app1::search-bar::S2')
  })

  it('falls back to the first provider when the stored one is gone', () => {
    seedProvider({ id: 'S1', title: 'Alpha', placeholder: 'alpha query' })
    useNetworkSearchProviderSelectionStore.setState({
      selectedProviderId: 'goneApp::search-bar::gone',
    })
    render(<NetworkSearchBar />)

    expect(
      screen
        .getByTestId('network-search-input')
        .getAttribute('placeholder'),
    ).toBe('alpha query')
  })
})
