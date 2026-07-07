import { act, renderHook } from '@testing-library/react'

import { useTableStore } from '../../../data/hooks/stores/TableStore'
import {
  DEFAULT_UI_STATE,
  useUiStateStore,
} from '../../../data/hooks/stores/UiStateStore'
import { Column } from '../../../models'
import { TableType } from '../../../models/StoreModel/TableStoreModel'
import { createTable } from '../../../models/TableModel/impl/inMemoryTable'
import { VisualStyleOptions } from '../../../models/VisualStyleModel/VisualStyleOptions'
import { useUpdateTables } from './updateTables'

// Mock the database operations to avoid IndexedDB issues in tests
jest.mock('../../../data/db', () => ({
  ...jest.requireActual('../../../data/db'),
  putTablesToDb: jest.fn().mockResolvedValue(undefined),
  deleteTablesFromDb: jest.fn().mockResolvedValue(undefined),
  clearTablesFromDb: jest.fn().mockResolvedValue(undefined),
  putUiStateToDb: jest.fn().mockResolvedValue(undefined),
}))

// Mock the workspace store to provide a current network ID
jest.mock('../../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      workspace: {
        currentNetworkId: 'net1',
      },
    })),
  },
}))

const NETWORK_ID = 'net1'

const nodeColumns: Column[] = [{ name: 'name', type: 'string' }]
const edgeColumns: Column[] = [{ name: 'interaction', type: 'string' }]

// Payload shape captured from a live run of the updatetablesexample service
const nodeUpdateResponse = {
  id: 'node',
  columns: [{ id: 'test_col', type: 'string' }],
  rows: {
    '1': { test_col: 'test_val' },
    '2': { test_col: 'test_val' },
  },
}

const seedTables = (): void => {
  const nodeTable = createTable(
    `node-${NETWORK_ID}`,
    nodeColumns,
    new Map([
      ['1', { name: 'A' }],
      ['2', { name: 'B' }],
    ]),
  )
  const edgeTable = createTable(
    `edge-${NETWORK_ID}`,
    edgeColumns,
    new Map([['e3', { interaction: 'interacts' }]]),
  )
  act(() => {
    useTableStore.getState().add(NETWORK_ID, nodeTable, edgeTable)
  })
}

const seedDisplayConfiguration = (): void => {
  const visualStyleOptions: VisualStyleOptions = {
    visualEditorProperties: {
      nodeSizeLocked: false,
      arrowColorMatchesEdge: false,
      tableDisplayConfiguration: {
        nodeTable: {
          columnConfiguration: [{ attributeName: 'name', visible: true }],
        },
        edgeTable: {
          columnConfiguration: [
            { attributeName: 'interaction', visible: true },
          ],
        },
      },
    },
  }
  act(() => {
    useUiStateStore
      .getState()
      .setVisualStyleOptions(NETWORK_ID, visualStyleOptions)
  })
}

const getDisplayConfiguration = () =>
  useUiStateStore.getState().ui.visualStyleOptions?.[NETWORK_ID]
    ?.visualEditorProperties?.tableDisplayConfiguration

describe('useUpdateTables', () => {
  beforeEach(() => {
    act(() => {
      useTableStore.getState().deleteAll()
      useUiStateStore.getState().setUi(DEFAULT_UI_STATE)
    })
    seedTables()
  })

  it('adds a new column to the node table model and to the table display configuration', () => {
    seedDisplayConfiguration()
    const { result } = renderHook(() => useUpdateTables())

    act(() => {
      result.current({ responseObj: nodeUpdateResponse, networkId: NETWORK_ID })
    })

    // Data model must contain the new column and values
    const nodeTable = useTableStore.getState().tables[NETWORK_ID].nodeTable
    expect(nodeTable.columns.map((c) => c.name)).toContain('test_col')
    expect(nodeTable.rows.get('1')?.test_col).toEqual('test_val')
    expect(nodeTable.rows.get('2')?.test_col).toEqual('test_val')

    // Display configuration must also list the new column, or the
    // Table Browser will never render it (GH issue #569)
    const config = getDisplayConfiguration()
    const nodeColumnNames = config?.nodeTable.columnConfiguration.map(
      (c) => c.attributeName,
    )
    // The new column is appended after the existing columns
    expect(nodeColumnNames).toEqual(['name', 'test_col'])
    // The edge table configuration must be untouched
    expect(config?.edgeTable.columnConfiguration).toEqual([
      { attributeName: 'interaction', visible: true },
    ])
  })

  it('updates the edge table and its display configuration, translating numeric edge ids', () => {
    seedDisplayConfiguration()
    const { result } = renderHook(() => useUpdateTables())

    act(() => {
      result.current({
        responseObj: {
          id: 'edge',
          columns: [{ id: 'test_col', type: 'string' }],
          rows: { '3': { test_col: 'test_val' } },
        },
        networkId: NETWORK_ID,
      })
    })

    const edgeTable = useTableStore.getState().tables[NETWORK_ID].edgeTable
    expect(edgeTable.columns.map((c) => c.name)).toContain('test_col')
    // Numeric CX2 edge id '3' must be translated to the internal 'e3' id
    expect(edgeTable.rows.get('e3')?.test_col).toEqual('test_val')

    const config = getDisplayConfiguration()
    const edgeColumnNames = config?.edgeTable.columnConfiguration.map(
      (c) => c.attributeName,
    )
    // The new column is appended after the existing columns
    expect(edgeColumnNames).toEqual(['interaction', 'test_col'])
    expect(config?.nodeTable.columnConfiguration).toEqual([
      { attributeName: 'name', visible: true },
    ])
  })

  it('does not duplicate a display configuration entry when a column with the same name exists', () => {
    seedDisplayConfiguration()
    const { result } = renderHook(() => useUpdateTables())

    act(() => {
      result.current({
        responseObj: {
          id: 'node',
          // Same name as an existing column, but a different type: the data
          // model treats it as a new column, the display config must not
          columns: [{ id: 'name', type: 'long' }],
          rows: { '1': { name: 42 } },
        },
        networkId: NETWORK_ID,
      })
    })

    const config = getDisplayConfiguration()
    const nameEntries = config?.nodeTable.columnConfiguration.filter(
      (c) => c.attributeName === 'name',
    )
    expect(nameEntries).toHaveLength(1)
  })

  it('only registers columns from the update response, not unrelated stale model columns', () => {
    seedDisplayConfiguration()
    act(() => {
      const nodeTable = useTableStore.getState().tables[NETWORK_ID].nodeTable
      useTableStore.getState().setTable(NETWORK_ID, TableType.NODE, {
        ...nodeTable,
        columns: [
          ...nodeTable.columns,
          { name: 'stale_model_only', type: 'string' },
        ],
      })
    })
    const { result } = renderHook(() => useUpdateTables())

    act(() => {
      result.current({ responseObj: nodeUpdateResponse, networkId: NETWORK_ID })
    })

    const config = getDisplayConfiguration()
    const nodeColumnNames = config?.nodeTable.columnConfiguration.map(
      (c) => c.attributeName,
    )
    expect(nodeColumnNames).toEqual(['name', 'test_col'])
  })

  it('leaves the UI state untouched when no display configuration exists', () => {
    const { result } = renderHook(() => useUpdateTables())

    act(() => {
      result.current({ responseObj: nodeUpdateResponse, networkId: NETWORK_ID })
    })

    // Data model is still updated
    const nodeTable = useTableStore.getState().tables[NETWORK_ID].nodeTable
    expect(nodeTable.columns.map((c) => c.name)).toContain('test_col')

    // No configuration is fabricated: the Table Browser falls back to
    // rendering the table model columns in this case
    expect(
      useUiStateStore.getState().ui.visualStyleOptions?.[NETWORK_ID],
    ).toBeUndefined()
  })
})
