import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Table } from '@/models/TableModel'

import { NO_VALUE_LABEL } from './AttributeValue'
import { PropertyPanel } from './PropertyPanel'

const NETWORK_ID = 'net1_sub1'

const { storeState } = vi.hoisted(() => ({
  storeState: {
    tables: {} as Record<string, { nodeTable: Table; edgeTable: Table }>,
    selectedNodes: [] as string[],
  },
}))

vi.mock('@/data/hooks/stores/TableStore', () => ({
  useTableStore: (selector: (state: unknown) => unknown) =>
    selector({ tables: storeState.tables }),
}))
vi.mock('@/data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: (selector: (state: unknown) => unknown) =>
    selector({
      getViewModel: () => ({
        selectedNodes: storeState.selectedNodes,
        selectedEdges: [],
      }),
    }),
}))

const nodeTable = {
  id: NETWORK_ID,
  columns: [
    { name: 'name', type: 'string' },
    { name: 'members', type: 'list_of_string' },
    { name: 'sizes', type: 'list_of_integer' },
    { name: 'flags', type: 'list_of_boolean' },
    { name: 'querynode', type: 'boolean' },
    { name: 'bait', type: 'boolean' },
    { name: 'score', type: 'double' },
    { name: 'locations', type: 'string' },
    { name: 'imageurl', type: 'string' },
    { name: 'ensembl', type: 'string' },
    { name: 'missing', type: 'string' },
    { name: 'empty list', type: 'list_of_string' },
    { name: 'cleared', type: 'string' },
  ],
  rows: new Map([
    [
      'n1',
      {
        name: 'NBEA',
        members: ['alice', 'bob', 'mary'],
        sizes: [1, 20, 3],
        flags: [true, false],
        querynode: true,
        bait: false,
        score: 0,
        locations: null,
        imageurl: 'http://images.proteinatlas.org/39730/534_B10_1.jpg',
        ensembl: 'ensembl:ENSG00000172915',
        'empty list': [],
        // The table browser writes '' when a string cell is cleared
        cleared: '',
        // 'missing' is absent from the row
      },
    ],
  ]),
} as unknown as Table

// The value shown under a column name
const valueOf = (column: string): HTMLElement => {
  const item = screen.getByText(`${column}:`).closest('li')
  expect(item).not.toBeNull()
  // ListItemText renders the value first in the DOM (the stack is flipped)
  return item!.querySelector('.MuiListItemText-primary') as HTMLElement
}

describe('PropertyPanel', () => {
  beforeEach(() => {
    storeState.tables = {
      [NETWORK_ID]: { nodeTable, edgeTable: nodeTable },
    }
    storeState.selectedNodes = ['n1']
  })

  it('shows list values separated by commas', () => {
    render(<PropertyPanel networkId={NETWORK_ID} />)

    expect(valueOf('members').textContent).toBe('alice, bob, mary')
    expect(valueOf('sizes').textContent).toBe('1, 20, 3')
    expect(valueOf('flags').textContent).toBe('true, false')
  })

  it('shows boolean and zero values', () => {
    render(<PropertyPanel networkId={NETWORK_ID} />)

    expect(valueOf('querynode').textContent).toBe('true')
    expect(valueOf('bait').textContent).toBe('false')
    expect(valueOf('score').textContent).toBe('0')
  })

  it('shows a muted placeholder for null, absent, empty list and empty string values', () => {
    render(<PropertyPanel networkId={NETWORK_ID} />)

    for (const column of ['locations', 'missing', 'empty list', 'cleared']) {
      const placeholder = within(valueOf(column)).getByTestId(
        'attribute-value-empty',
      )
      expect(placeholder.textContent).toBe(NO_VALUE_LABEL)
    }
    expect(screen.getAllByTestId('attribute-value-empty')).toHaveLength(4)
  })

  it('links URLs and Ensembl gene ids, opening a new tab', () => {
    render(<PropertyPanel networkId={NETWORK_ID} />)

    const url = within(valueOf('imageurl')).getByRole('link')
    expect(url.getAttribute('href')).toBe(
      'http://images.proteinatlas.org/39730/534_B10_1.jpg',
    )
    expect(url.getAttribute('target')).toBe('_blank')
    expect(url.getAttribute('rel')).toBe('noopener noreferrer')

    const gene = within(valueOf('ensembl')).getByRole('link')
    expect(gene.textContent).toBe('ensembl:ENSG00000172915')
    expect(gene.getAttribute('href')).toBe(
      'https://www.ncbi.nlm.nih.gov/gene/?term=ENSG00000172915',
    )
  })

  it('does not link plain text', () => {
    render(<PropertyPanel networkId={NETWORK_ID} />)

    expect(within(valueOf('members')).queryByRole('link')).toBeNull()
  })

  it('shows the node name as the title and not as a row', () => {
    render(<PropertyPanel networkId={NETWORK_ID} />)

    expect(screen.getByText('NBEA')).toBeTruthy()
    expect(screen.queryByText('name:')).toBeNull()
  })
})
