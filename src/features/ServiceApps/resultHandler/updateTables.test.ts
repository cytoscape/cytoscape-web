import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useUpdateTables } from './updateTables'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { TableType } from '../../../models/StoreModel/TableStoreModel'
import { ValueTypeName } from '../../../models/TableModel'
import { ColumnTypeConflictError } from '../../../models/TableModel/impl/columnNames'

describe('useUpdateTables', () => {
  beforeEach(() => {
    useTableStore.setState({ tables: {} })
    useUiStateStore.setState({
      ui: {
        panels: {} as any,
        activeNetworkView: '',
        enablePopup: false,
        showErrorDialog: false,
        errorMessage: '',
        tableUi: { columnUiState: {}, activeTabIndex: 0 },
        networkBrowserPanelUi: { activeTabIndex: 0 },
        visualStyleOptions: {},
        networkViewUi: { activeTabIndex: 0 },
      },
    })
  })

  it('updates the table store and table display configuration when a new column is added', () => {
    const networkId = 'network1'

    // Setup initial table
    useTableStore.setState({
      tables: {
        [networkId]: {
          nodeTable: {
            id: networkId,
            columns: [{ name: 'id', type: ValueTypeName.String }],
            rows: new Map([['node1', { id: 'node1' }]]),
          },
          edgeTable: {
            id: networkId,
            columns: [],
            rows: new Map(),
          },
        },
      },
    })

    // Setup initial UI state configuration
    useUiStateStore.setState((state) => ({
      ui: {
        ...state.ui,
        visualStyleOptions: {
          [networkId]: {
            visualEditorProperties: {
              tableDisplayConfiguration: {
                nodeTable: {
                  columnConfiguration: [
                    { attributeName: 'id', visible: true, columnWidth: 100 },
                  ],
                },
                edgeTable: {
                  columnConfiguration: [],
                },
              },
            },
          },
        },
      },
    }))

    const { result } = renderHook(() => useUpdateTables())

    const responseObj = {
      id: TableType.NODE,
      columns: [
        { id: 'id', type: ValueTypeName.String },
        { id: 'newScore', type: ValueTypeName.Double },
      ],
      rows: {
        node1: { id: 'node1', newScore: 0.95 },
        node2: { id: 'node2', newScore: 0.1 }, // new row
      },
    }

    act(() => {
      result.current({ responseObj, networkId })
    })

    const nodeTable = useTableStore.getState().tables[networkId].nodeTable
    expect(nodeTable.columns.length).toBe(2)
    expect(nodeTable.columns[1].name).toBe('newScore')
    expect(nodeTable.rows.get('node1')?.newScore).toBe(0.95)
    expect(nodeTable.rows.get('node2')?.newScore).toBe(0.1)

    const uiState = useUiStateStore.getState().ui
    const nodeConfig =
      uiState.visualStyleOptions?.[networkId]?.visualEditorProperties
        ?.tableDisplayConfiguration?.nodeTable?.columnConfiguration

    expect(nodeConfig).toBeDefined()
    expect(nodeConfig?.length).toBe(2)
    expect(nodeConfig?.[1].attributeName).toBe('newScore')
  })

  it('handles empty tableDisplayConfiguration gracefully', () => {
    const networkId = 'network2'

    // Setup initial table without visualStyleOptions configuration
    useTableStore.setState({
      tables: {
        [networkId]: {
          nodeTable: {
            id: networkId,
            columns: [],
            rows: new Map(),
          },
          edgeTable: {
            id: networkId,
            columns: [],
            rows: new Map(),
          },
        },
      },
    })

    const { result } = renderHook(() => useUpdateTables())

    const responseObj = {
      id: TableType.NODE,
      columns: [{ id: 'newScore', type: ValueTypeName.Double }],
      rows: {
        node1: { newScore: 0.95 },
      },
    }

    act(() => {
      result.current({ responseObj, networkId })
    })

    const nodeTable = useTableStore.getState().tables[networkId].nodeTable
    expect(nodeTable.columns.length).toBe(1)
    expect(nodeTable.columns[0].name).toBe('newScore')
    expect(nodeTable.rows.get('node1')?.newScore).toBe(0.95)

    const uiState = useUiStateStore.getState().ui
    const config =
      uiState.visualStyleOptions?.[networkId]?.visualEditorProperties
        ?.tableDisplayConfiguration
    expect(config).toBeUndefined() // Since there was no config initially, it shouldn't be created out of thin air
  })

  describe('duplicate column names (#951)', () => {
    const networkId = 'network3'

    const seed = () => {
      useTableStore.setState({
        tables: {
          [networkId]: {
            nodeTable: {
              id: networkId,
              columns: [
                { name: 'name', type: ValueTypeName.String },
                { name: 'count', type: ValueTypeName.Long },
              ],
              rows: new Map([['node1', { name: 'a', count: 1 }]]),
            },
            edgeTable: { id: networkId, columns: [], rows: new Map() },
          },
        },
      })
    }

    const apply = (columns: { id: string; type: string }[], rows: unknown) => {
      const { result } = renderHook(() => useUpdateTables())
      act(() => {
        result.current({
          responseObj: { id: TableType.NODE, columns, rows } as any,
          networkId,
        })
      })
    }

    const nodeTable = () => useTableStore.getState().tables[networkId].nodeTable

    beforeEach(seed)

    it('writes a case variant to the existing column', () => {
      apply([{ id: 'Name', type: ValueTypeName.String }], {
        node1: { Name: 'b' },
      })

      expect(nodeTable().columns.map((c) => c.name)).toEqual(['name', 'count'])
      expect(nodeTable().rows.get('node1')).toEqual({ name: 'b', count: 1 })
    })

    it('merges new columns: first spelling and type, last value', () => {
      apply(
        [
          { id: 'Tag', type: ValueTypeName.String },
          { id: 'TAG', type: ValueTypeName.String },
        ],
        { node1: { TAG: 'x', Tag: 'y' } },
      )

      expect(nodeTable().columns.map((c) => c.name)).toEqual([
        'name',
        'count',
        'Tag',
      ])
      expect(nodeTable().rows.get('node1')?.Tag).toBe('y')
    })

    it('keeps the value of a row with only one spelling', () => {
      apply(
        [
          { id: 'Tag', type: ValueTypeName.String },
          { id: 'TAG', type: ValueTypeName.String },
        ],
        { node1: { TAG: 'only' } },
      )

      expect(nodeTable().rows.get('node1')?.Tag).toBe('only')
    })

    it('merges the keys of a new row', () => {
      apply([{ id: 'Name', type: ValueTypeName.String }], {
        node2: { name: 'first', Name: 'second' },
      })

      expect(nodeTable().rows.get('node2')).toEqual({ name: 'second' })
    })

    it('does not add a column for an exact name of another type', () => {
      apply([{ id: 'count', type: ValueTypeName.String }], { node1: {} })

      expect(nodeTable().columns.map((c) => c.name)).toEqual(['name', 'count'])
    })

    it.each([
      ['a case variant', 'Count'],
      ['the exact name', 'count'],
    ])('fails for a value of another type under %s', (_label, id) => {
      expect(() =>
        apply([{ id, type: ValueTypeName.String }], {
          node1: { [id]: 'many' },
        }),
      ).toThrow(ColumnTypeConflictError)

      expect(nodeTable().columns).toHaveLength(2)
      expect(nodeTable().rows.get('node1')).toEqual({ name: 'a', count: 1 })
    })

    it('does not fail for a null value of another type', () => {
      apply([{ id: 'Count', type: ValueTypeName.String }], {
        node1: { Count: null },
      })

      expect(nodeTable().rows.get('node1')).toEqual({ name: 'a', count: null })
    })

    it('still ignores a key no column declares on an existing row', () => {
      apply([], { node1: { Name: 'ignored' } })

      expect(nodeTable().rows.get('node1')).toEqual({ name: 'a', count: 1 })
    })

    it('keeps a row key named __proto__ out of the prototype', () => {
      apply(
        [{ id: '__proto__', type: ValueTypeName.String }],
        JSON.parse('{"node2":{"__proto__":"x"}}'),
      )

      const row = nodeTable().rows.get('node2')
      expect(row && Object.getPrototypeOf(row)).toBe(Object.prototype)
      expect(row && Object.keys(row)).toEqual(['__proto__'])
    })

    it.each([
      ['null rows', null],
      ['a row that is not an object', { node1: 5 }],
      ['a null row', { node1: null }],
    ])('ignores a response with %s', (_label, rows) => {
      apply([{ id: 'Name', type: ValueTypeName.String }], rows)

      expect(nodeTable().rows.get('node1')).toEqual({ name: 'a', count: 1 })
    })
  })
})
