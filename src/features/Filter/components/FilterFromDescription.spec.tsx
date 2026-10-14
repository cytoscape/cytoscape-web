import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFilterStore } from '@/data/hooks/stores/FilterStore'
import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useTableStore } from '@/data/hooks/stores/TableStore'
import { OLLAMA_DEFAULT_BASE_URL } from '@/features/LLMQuery/model/LLMProvider'
import { useLLMQueryStore } from '@/features/LLMQuery/store'
import { DisplayMode } from '@/models/FilterModel/DisplayMode'
import {
  FilterPredicate,
  MatchType,
  WorkspaceFilter,
} from '@/models/FilterModel/FilterTree'
import {
  createColumnFilter,
  createCompositeFilter,
  createWorkspaceFilter,
} from '@/models/FilterModel/impl/filterTreeImpl'
import type { IdType } from '@/models/IdType'
import type { Network } from '@/models/NetworkModel'
import type { Table } from '@/models/TableModel'

import type {
  GenerateFilterInput,
  GenerateFilterResult,
} from '../llm/generateFilter'
import { sortFiltersByName } from '../utils/filterTabUtil'
import { FilterHeader } from './FilterHeader'

const { generateFilterMock } = vi.hoisted(() => ({
  generateFilterMock: vi.fn(),
}))

vi.mock('../llm/generateFilter', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../llm/generateFilter')>()),
  generateFilter: generateFilterMock,
}))

const NET = 'net1'

const network: Network = {
  id: NET,
  nodes: [{ id: 'n1' }],
  edges: [],
}

const nodeTable: Table = {
  id: NET,
  columns: [{ name: 'score', type: 'double' }],
  rows: new Map([['n1', { score: 1 }]]),
}

const edgeTable: Table = { id: NET, columns: [], rows: new Map() }

const GENERATED = {
  name: 'High scores',
  root: createCompositeFilter(MatchType.ALL, [
    {
      ...createColumnFilter(),
      columnName: 'score',
      predicate: FilterPredicate.BETWEEN,
      criterion: [0.5, 1],
    },
  ]),
}

// The header the way FilterTab renders it
const Harness = ({ networkId }: { networkId?: IdType }): JSX.Element => {
  const workspaceFilters = useFilterStore((state) => state.workspaceFilters)
  const selectedId = useFilterStore((state) => state.selectedWorkspaceFilterId)
  const filters = sortFiltersByName(Object.values(workspaceFilters))
  const selected =
    filters.find((filter) => filter.id === selectedId) ?? filters[0]
  return (
    <FilterHeader filters={filters} selected={selected} networkId={networkId} />
  )
}

const openPopover = (): void => {
  fireEvent.click(screen.getByTestId('filter-options-button'))
  fireEvent.click(screen.getByTestId('filter-describe-menu-item'))
}

const input = (): HTMLTextAreaElement =>
  screen.getByTestId('filter-describe-input') as HTMLTextAreaElement

const generateButton = (): HTMLButtonElement =>
  screen.getByTestId('filter-describe-generate') as HTMLButtonElement

const type = (text: string): void => {
  fireEvent.change(input(), { target: { value: text } })
}

const filtersInStore = (): WorkspaceFilter[] =>
  Object.values(useFilterStore.getState().workspaceFilters)

const setLLM = (
  state: Partial<ReturnType<typeof useLLMQueryStore.getState>>,
): void => {
  useLLMQueryStore.setState({
    LLMProvider: 'openai',
    LLMBaseUrl: '',
    LLMModel: 'gpt-6-luna',
    LLMApiKey: 'sk-openai',
    LLMCustomApiKey: 'sk-custom',
    ...state,
  })
}

describe('FilterFromDescription', () => {
  beforeEach(() => {
    generateFilterMock.mockReset()
    useFilterStore.setState({
      workspaceFilters: { f1: createWorkspaceFilter('f1', 'Hubs') },
      selectedWorkspaceFilterId: 'f1',
    })
    useMessageStore.setState({ messages: [] } as any)
    useNetworkStore.setState({ networks: new Map([[NET, network]]) })
    useTableStore.setState({ tables: { [NET]: { nodeTable, edgeTable } } })
    setLLM({})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is offered once the tab has a network', () => {
    const { rerender } = render(<Harness />)
    fireEvent.click(screen.getByTestId('filter-options-button'))
    expect(
      screen
        .getByTestId('filter-describe-menu-item')
        .getAttribute('aria-disabled'),
    ).toBe('true')
    rerender(<Harness networkId={NET} />)
    expect(
      screen
        .getByTestId('filter-describe-menu-item')
        .getAttribute('aria-disabled'),
    ).toBeNull()
  })

  describe('says what is sent, and to whom', () => {
    it.each([
      ['openai', '', 'Sent to OpenAI:'],
      [
        'ollama',
        OLLAMA_DEFAULT_BASE_URL,
        'Sent to your local Ollama server (localhost:11434):',
      ],
      ['custom', 'https://llm.example.org/v1', 'Sent to llm.example.org:'],
    ] as const)('for %s', (provider, baseUrl, start) => {
      setLLM({ LLMProvider: provider, LLMBaseUrl: baseUrl })
      render(<Harness networkId={NET} />)
      openPopover()
      const disclosure = screen.getByTestId('filter-describe-disclosure')
      expect(disclosure.textContent?.startsWith(start)).toBe(true)
      expect(disclosure.textContent).toContain(
        'column names, column types, value ranges and up to 8 sample values per text column',
      )
    })
  })

  it('asks for an LLM when none is set up', () => {
    setLLM({ LLMApiKey: '' })
    render(<Harness networkId={NET} />)
    openPopover()
    expect(screen.getByTestId('filter-describe-status').textContent).toContain(
      'Set up an LLM in Analysis › LLM Query Options.',
    )
    expect(input().disabled).toBe(true)
    expect(generateButton().disabled).toBe(true)
  })

  it('generates only with a description', () => {
    render(<Harness networkId={NET} />)
    openPopover()
    expect(generateButton().disabled).toBe(true)
    type('   ')
    expect(generateButton().disabled).toBe(true)
    type('select high scores')
    expect(generateButton().disabled).toBe(false)
  })

  it('adds, shows and announces the generated filter', async () => {
    generateFilterMock.mockResolvedValue({
      kind: 'filter',
      filter: GENERATED,
      mode: 'hide',
      displayMode: DisplayMode.SHOW_HIDE,
      explanation: 'Hides nodes with a low score.',
    } satisfies GenerateFilterResult)
    render(<Harness networkId={NET} />)
    openPopover()
    type('hide low scores')
    fireEvent.click(screen.getByTestId('filter-describe-generate'))

    await waitFor(() =>
      expect(screen.queryByTestId('filter-describe-popover')).toBeNull(),
    )
    const request: GenerateFilterInput = generateFilterMock.mock.calls[0][0]
    expect(request).toMatchObject({
      request: 'hide low scores',
      network,
      nodeTable,
      edgeTable,
      settings: {
        providerId: 'openai',
        baseUrl: '',
        model: 'gpt-6-luna',
        apiKey: 'sk-openai',
      },
    })
    const added = filtersInStore().find((f) => f.name === 'High scores')
    expect(added).toMatchObject({
      root: GENERATED.root,
      displayMode: DisplayMode.SHOW_HIDE,
    })
    expect(useFilterStore.getState().selectedWorkspaceFilterId).toBe(added?.id)
    expect(useMessageStore.getState().messages).toMatchObject([
      {
        message:
          'Created filter "High scores" (show mode). Hides nodes with a low score.',
        severity: 'success',
      },
    ])
  })

  it('sends only the key of the selected provider', async () => {
    setLLM({ LLMProvider: 'custom', LLMBaseUrl: 'https://llm.example.org/v1' })
    generateFilterMock.mockResolvedValue({ kind: 'cancelled' })
    render(<Harness networkId={NET} />)
    openPopover()
    type('select hubs')
    fireEvent.click(screen.getByTestId('filter-describe-generate'))
    await waitFor(() => expect(generateFilterMock).toHaveBeenCalled())
    expect(generateFilterMock.mock.calls[0][0].settings.apiKey).toBe(
      'sk-custom',
    )
  })

  it('generates on Enter, and adds a line on Shift+Enter', async () => {
    generateFilterMock.mockResolvedValue({ kind: 'cancelled' })
    render(<Harness networkId={NET} />)
    openPopover()
    type('select hubs')
    fireEvent.keyDown(input(), { key: 'Enter', shiftKey: true })
    expect(generateFilterMock).not.toHaveBeenCalled()
    fireEvent.keyDown(input(), { key: 'Enter' })
    await waitFor(() => expect(generateFilterMock).toHaveBeenCalledTimes(1))
  })

  it.each([
    [
      { kind: 'unsupported', reason: 'Filters cannot rank nodes.' },
      "This can't be expressed as a filter: Filters cannot rank nodes.",
    ],
    [
      { kind: 'failed', reason: '401 Incorrect API key provided: sk-….' },
      "Couldn't build a filter: 401 Incorrect API key provided: sk-….",
    ],
  ] as const)(
    'stays open with the text when no filter is made (%j)',
    async (result, status) => {
      generateFilterMock.mockResolvedValue(result)
      render(<Harness networkId={NET} />)
      openPopover()
      type('the top 10 nodes')
      fireEvent.click(screen.getByTestId('filter-describe-generate'))

      await waitFor(() =>
        expect(
          screen.getByTestId('filter-describe-status').textContent,
        ).toContain(status),
      )
      expect(input().value).toBe('the top 10 nodes')
      expect(filtersInStore()).toHaveLength(1)
    },
  )

  it('shows model text as text, never as markup', async () => {
    generateFilterMock.mockResolvedValue({
      kind: 'unsupported',
      reason: '<img src=x onerror=alert(1)><b>bold</b>',
    })
    render(<Harness networkId={NET} />)
    openPopover()
    type('select hubs')
    fireEvent.click(screen.getByTestId('filter-describe-generate'))
    const status = screen.getByTestId('filter-describe-status')
    await waitFor(() => expect(status.textContent).toContain('<b>bold</b>'))
    expect(status.querySelector('img, b')).toBeNull()
  })

  it('shows the request running, and Cancel aborts it and closes', async () => {
    let signal: AbortSignal | undefined
    generateFilterMock.mockImplementation(
      (request: GenerateFilterInput) =>
        new Promise((resolve) => {
          signal = request.signal
          request.signal?.addEventListener('abort', () =>
            resolve({ kind: 'cancelled' }),
          )
        }),
    )
    render(<Harness networkId={NET} />)
    openPopover()
    type('select hubs')
    fireEvent.click(screen.getByTestId('filter-describe-generate'))

    await waitFor(() =>
      expect(
        screen.getByTestId('filter-describe-status').textContent,
      ).toContain('Asking gpt-6-luna…'),
    )
    expect(generateButton().disabled).toBe(true)
    expect(input().readOnly).toBe(true)

    fireEvent.click(screen.getByTestId('filter-describe-cancel'))
    expect(signal?.aborted).toBe(true)
    await waitFor(() =>
      expect(screen.queryByTestId('filter-describe-popover')).toBeNull(),
    )
    expect(filtersInStore()).toHaveLength(1)
  })

  it('ignores Escape: only its buttons close it', () => {
    render(<Harness networkId={NET} />)
    openPopover()
    fireEvent.keyDown(screen.getByTestId('filter-describe-popover'), {
      key: 'Escape',
    })
    expect(screen.queryByTestId('filter-describe-popover')).not.toBeNull()
  })

  it('closes and aborts when the tab switches networks', async () => {
    let signal: AbortSignal | undefined
    generateFilterMock.mockImplementation(
      (request: GenerateFilterInput) =>
        new Promise(() => {
          signal = request.signal
        }),
    )
    const { rerender } = render(<Harness networkId={NET} />)
    openPopover()
    type('select hubs')
    fireEvent.click(screen.getByTestId('filter-describe-generate'))
    await waitFor(() => expect(signal).toBeDefined())

    rerender(<Harness networkId="net2" />)
    await waitFor(() =>
      expect(screen.queryByTestId('filter-describe-popover')).toBeNull(),
    )
    expect(signal?.aborted).toBe(true)

    // Coming back does not reopen it
    rerender(<Harness networkId={NET} />)
    expect(screen.queryByTestId('filter-describe-popover')).toBeNull()
  })
})
