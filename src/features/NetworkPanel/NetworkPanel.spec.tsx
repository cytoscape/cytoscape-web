import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { IdType } from '../../models/IdType'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import NetworkPanel from './NetworkPanel'

// The renderers registry decides which child NetworkPanel mounts. A stub keeps
// this test off Cytoscape.js while still proving whether the renderer would be
// mounted at all.
vi.mock('./NetworkTab', () => ({
  NetworkTab: () => <div data-testid="network-tab-stub" />,
}))
vi.mock('./NetworkTabs', () => ({
  NetworkTabs: () => <div data-testid="network-tabs-stub" />,
}))

vi.mock('../../data/db', () => ({
  putNetworkToDb: vi.fn().mockResolvedValue(undefined),
  putTablesToDb: vi.fn().mockResolvedValue(undefined),
  putVisualStyleToDb: vi.fn().mockResolvedValue(undefined),
  deleteNetworkFromDb: vi.fn().mockResolvedValue(undefined),
  clearNetworksFromDb: vi.fn().mockResolvedValue(undefined),
  deleteTablesFromDb: vi.fn().mockResolvedValue(undefined),
  clearTablesFromDb: vi.fn().mockResolvedValue(undefined),
  deleteVisualStyleFromDb: vi.fn().mockResolvedValue(undefined),
  clearVisualStyleFromDb: vi.fn().mockResolvedValue(undefined),
}))

const NETWORK_ID: IdType = 'net-under-test'

const emptyTable = (id: IdType) => ({
  id,
  columns: [{ name: 'name', type: ValueTypeName.String }],
  rows: new Map(),
})

const seedNetwork = (): void => {
  useNetworkStore.setState({
    networks: new Map([
      [NETWORK_ID, { id: NETWORK_ID, nodes: [{ id: 'n1' }], edges: [] }],
    ]) as any,
  })
}

const seedVisualStyle = (): void => {
  useVisualStyleStore.setState({
    visualStyles: { [NETWORK_ID]: {} },
  } as any)
}

const seedTables = (): void => {
  useTableStore
    .getState()
    .add(
      NETWORK_ID,
      emptyTable(`${NETWORK_ID}-nodes`) as any,
      emptyTable(`${NETWORK_ID}-edges`) as any,
    )
}

describe('NetworkPanel', () => {
  beforeEach(() => {
    useNetworkStore.setState({ networks: new Map() as any })
    useTableStore.setState({ tables: {} } as any)
    useVisualStyleStore.setState({ visualStyles: {} } as any)
  })

  it('shows a loading state while the network itself is absent', () => {
    render(<NetworkPanel networkId={NETWORK_ID} />)

    expect(screen.getByText(/Loading network data/i)).toBeDefined()
  })

  /**
   * Regression: `Cannot read properties of undefined (reading 'nodeTable')`.
   *
   * NetworkPanel used to gate only on NetworkStore, so a network that had
   * arrived in NetworkStore without its tables mounted CyjsRenderer anyway. The
   * renderer then created a Cytoscape instance, its `[cy]` effect fired
   * `renderNetwork()`, and that dereferenced `tables[id].nodeTable` — throwing
   * inside a passive effect, which React Router surfaced as a render error.
   *
   * Cross-tab hydration makes this reachable: `cyNetworks` and `cyTables` are
   * separate rows written in separate transactions, so a poll can deliver the
   * network before its tables.
   */
  it('does not mount the renderer when the network has no tables yet', () => {
    seedNetwork()

    render(<NetworkPanel networkId={NETWORK_ID} />)

    expect(screen.queryByTestId('network-tab-stub')).toBeNull()
    expect(screen.queryByTestId('network-tabs-stub')).toBeNull()
    expect(screen.getByText(/Loading network data/i)).toBeDefined()
  })

  it('does not mount the renderer when the visual style is missing', () => {
    // renderNetwork reads the visual style unconditionally too, so mounting
    // without it would only produce a blank canvas.
    seedNetwork()
    seedTables()

    render(<NetworkPanel networkId={NETWORK_ID} />)

    expect(screen.queryByTestId('network-tab-stub')).toBeNull()
    expect(screen.getByText(/Loading network data/i)).toBeDefined()
  })

  it('mounts the renderer once the network, tables and style are present', () => {
    seedNetwork()
    seedTables()
    seedVisualStyle()

    render(<NetworkPanel networkId={NETWORK_ID} />)

    expect(screen.getByTestId('network-tab-stub')).toBeDefined()
  })

  it('surfaces a load failure instead of a loading state', () => {
    render(<NetworkPanel networkId={NETWORK_ID} failedToLoad="boom" />)

    expect(screen.getByText(/Failed to load network data: boom/i)).toBeDefined()
  })
})
