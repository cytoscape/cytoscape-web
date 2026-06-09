import { renderHook, act } from '@testing-library/react'
import { useUpdateTables } from './updateTables'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { TableType } from '../../../models/StoreModel/TableStoreModel'
import { ValueTypeName } from '../../../models/TableModel'

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
        networkViewUi: { activeTabIndex: 0 }
      }
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
            rows: new Map([['node1', { id: 'node1' }]])
          },
          edgeTable: {
            id: networkId,
            columns: [],
            rows: new Map()
          }
        }
      }
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
                  columnConfiguration: [{ attributeName: 'id', visible: true, columnWidth: 100 }]
                },
                edgeTable: {
                  columnConfiguration: []
                }
              }
            }
          }
        }
      }
    }))

    const { result } = renderHook(() => useUpdateTables())

    const responseObj = {
      id: TableType.NODE,
      columns: [
        { id: 'id', type: ValueTypeName.String },
        { id: 'newScore', type: ValueTypeName.Double }
      ],
      rows: {
        'node1': { id: 'node1', newScore: 0.95 },
        'node2': { id: 'node2', newScore: 0.1 } // new row
      }
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
    const nodeConfig = uiState.visualStyleOptions?.[networkId]?.visualEditorProperties?.tableDisplayConfiguration?.nodeTable?.columnConfiguration

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
            rows: new Map()
          },
          edgeTable: {
            id: networkId,
            columns: [],
            rows: new Map()
          }
        }
      }
    })

    const { result } = renderHook(() => useUpdateTables())

    const responseObj = {
      id: TableType.NODE,
      columns: [
        { id: 'newScore', type: ValueTypeName.Double }
      ],
      rows: {
        'node1': { newScore: 0.95 },
      }
    }

    act(() => {
      result.current({ responseObj, networkId })
    })

    const nodeTable = useTableStore.getState().tables[networkId].nodeTable
    expect(nodeTable.columns.length).toBe(1)
    expect(nodeTable.columns[0].name).toBe('newScore')
    expect(nodeTable.rows.get('node1')?.newScore).toBe(0.95)

    const uiState = useUiStateStore.getState().ui
    const config = uiState.visualStyleOptions?.[networkId]?.visualEditorProperties?.tableDisplayConfiguration
    expect(config).toBeUndefined() // Since there was no config initially, it shouldn't be created out of thin air
  })
})
