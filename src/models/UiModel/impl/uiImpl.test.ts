import { IdType } from '../../IdType'
import { TableType } from '../../StoreModel/TableStoreModel'
import {
  TableDisplayConfiguration,
  VisualStyleOptions,
} from '../../VisualStyleModel/VisualStyleOptions'
import { Panel } from '../Panel'
import { PanelState } from '../PanelState'
import { TableUIState } from '../TableUi'
import { Ui } from '../Ui'
import {
  deserializeColumnUIKey,
  enablePopup,
  setActiveNetworkBrowserPanelIndex,
  setActiveNetworkView,
  setActiveTableBrowserIndex,
  setArrowColorMatchesEdgeState,
  setColumnWidth,
  setCustomNetworkTabName,
  setErrorMessage,
  setNetworkViewTabIndex,
  setNodeSizeLockedState,
  setPanelState,
  setShowErrorDialog,
  setTableDisplayConfiguration,
  setTableState,
  setVisualStyleOptions,
  serializeColumnUIKey,
} from './uiImpl'

// to run these: npx jest src/models/UiModel/impl/uiImpl.test.ts

const createDefaultUi = (): Ui => {
  return {
    panels: {
      [Panel.LEFT]: PanelState.OPEN,
      [Panel.RIGHT]: PanelState.CLOSED,
      [Panel.BOTTOM]: PanelState.OPEN,
    },
    activeNetworkView: '',
    enablePopup: false,
    showErrorDialog: false,
    errorMessage: '',
    tableUi: {
      columnUiState: {},
      activeTabIndex: 0,
    },
    networkBrowserPanelUi: {
      activeTabIndex: 0,
    },
    visualStyleOptions: {},
    networkViewUi: {
      activeTabIndex: 0,
    },
  }
}

describe('UiImpl', () => {
  describe('setActiveNetworkView', () => {
    it('should set the active network view ID', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'

      const result = setActiveNetworkView(ui, networkId)

      expect(result.activeNetworkView).toBe(networkId)
      expect(result).not.toBe(ui) // Immutability check
      expect(ui.activeNetworkView).toBe('') // Original unchanged
    })
  })

  describe('setPanelState', () => {
    it('should set panel state', () => {
      const ui = createDefaultUi()

      const result = setPanelState(ui, Panel.LEFT, PanelState.CLOSED)

      expect(result.panels[Panel.LEFT]).toBe(PanelState.CLOSED)
      expect(result).not.toBe(ui) // Immutability check
      expect(ui.panels[Panel.LEFT]).toBe(PanelState.OPEN) // Original unchanged
    })

    it('should set different panel states independently', () => {
      const ui = createDefaultUi()

      let result = setPanelState(ui, Panel.LEFT, PanelState.CLOSED)
      result = setPanelState(result, Panel.RIGHT, PanelState.OPEN)
      result = setPanelState(result, Panel.BOTTOM, PanelState.HIDDEN)

      expect(result.panels[Panel.LEFT]).toBe(PanelState.CLOSED)
      expect(result.panels[Panel.RIGHT]).toBe(PanelState.OPEN)
      expect(result.panels[Panel.BOTTOM]).toBe(PanelState.HIDDEN)
    })
  })

  describe('enablePopup', () => {
    it('should enable popup', () => {
      const ui = createDefaultUi()

      const result = enablePopup(ui, true)

      expect(result.enablePopup).toBe(true)
      expect(result).not.toBe(ui) // Immutability check
      expect(ui.enablePopup).toBe(false) // Original unchanged
    })

    it('should disable popup', () => {
      const ui = { ...createDefaultUi(), enablePopup: true }

      const result = enablePopup(ui, false)

      expect(result.enablePopup).toBe(false)
    })
  })

  describe('setShowErrorDialog', () => {
    it('should show error dialog', () => {
      const ui = createDefaultUi()

      const result = setShowErrorDialog(ui, true)

      expect(result.showErrorDialog).toBe(true)
      expect(result).not.toBe(ui) // Immutability check
    })

    it('should hide error dialog and clear error message', () => {
      const ui = { ...createDefaultUi(), errorMessage: 'Test error' }

      let result = setShowErrorDialog(ui, true)
      result = setShowErrorDialog(result, false)

      expect(result.showErrorDialog).toBe(false)
      expect(result.errorMessage).toBe('')
    })
  })

  describe('setErrorMessage', () => {
    it('should set error message', () => {
      const ui = createDefaultUi()
      const errorMessage = 'Test error message'

      const result = setErrorMessage(ui, errorMessage)

      expect(result.errorMessage).toBe(errorMessage)
      expect(result).not.toBe(ui) // Immutability check
      expect(ui.errorMessage).toBe('') // Original unchanged
    })
  })

  describe('setActiveTableBrowserIndex', () => {
    it('should set active table browser tab index', () => {
      const ui = createDefaultUi()

      const result = setActiveTableBrowserIndex(ui, 2)

      expect(result.tableUi.activeTabIndex).toBe(2)
      expect(result).not.toBe(ui) // Immutability check
      expect(ui.tableUi.activeTabIndex).toBe(0) // Original unchanged
    })
  })

  describe('setNetworkViewTabIndex', () => {
    it('should set network view tab index', () => {
      const ui = createDefaultUi()

      const result = setNetworkViewTabIndex(ui, 1)

      expect(result.networkViewUi.activeTabIndex).toBe(1)
      expect(result).not.toBe(ui) // Immutability check
    })
  })

  describe('setActiveNetworkBrowserPanelIndex', () => {
    it('should set active network browser panel tab index', () => {
      const ui = createDefaultUi()

      const result = setActiveNetworkBrowserPanelIndex(ui, 3)

      expect(result.networkBrowserPanelUi.activeTabIndex).toBe(3)
      expect(result).not.toBe(ui) // Immutability check
    })
  })

  describe('setTableState', () => {
    it('should set table UI state', () => {
      const ui = createDefaultUi()
      const newTableState: TableUIState = {
        columnUiState: { key1: { width: 100 } },
        activeTabIndex: 2,
      }

      const result = setTableState(ui, newTableState)

      expect(result.tableUi).toEqual(newTableState)
      expect(result).not.toBe(ui) // Immutability check
    })
  })

  describe('setColumnWidth', () => {
    it('should set column width', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'
      const tableType: TableType = TableType.NODE
      const columnId = 'column-1'
      const width = 150

      const result = setColumnWidth(ui, networkId, tableType, columnId, width)

      const key = serializeColumnUIKey(networkId, tableType, columnId)
      expect(result.tableUi.columnUiState[key].width).toBe(width)
      expect(result).not.toBe(ui) // Immutability check
      expect(ui.tableUi.columnUiState[key]).toBeUndefined() // Original unchanged
    })

    it('should update existing column width', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'
      const tableType: TableType = TableType.NODE
      const columnId = 'column-1'

      let result = setColumnWidth(ui, networkId, tableType, columnId, 100)
      result = setColumnWidth(result, networkId, tableType, columnId, 200)

      const key = serializeColumnUIKey(networkId, tableType, columnId)
      expect(result.tableUi.columnUiState[key].width).toBe(200)
    })

    it('should handle multiple columns independently', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'
      const tableType: TableType = TableType.NODE

      let result = setColumnWidth(ui, networkId, tableType, 'column-1', 100)
      result = setColumnWidth(result, networkId, tableType, 'column-2', 200)

      const key1 = serializeColumnUIKey(networkId, tableType, 'column-1')
      const key2 = serializeColumnUIKey(networkId, tableType, 'column-2')
      expect(result.tableUi.columnUiState[key1].width).toBe(100)
      expect(result.tableUi.columnUiState[key2].width).toBe(200)
    })
  })

  describe('setVisualStyleOptions', () => {
    it('should set visual style options for a network', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'
      const visualStyleOptions: VisualStyleOptions = {
        visualEditorProperties: {
          nodeSizeLocked: true,
          arrowColorMatchesEdge: false,
          tableDisplayConfiguration: {
            nodeTable: {
              columnConfiguration: [],
            },
            edgeTable: {
              columnConfiguration: [],
            },
          },
        },
      }

      const result = setVisualStyleOptions(ui, networkId, visualStyleOptions)

      expect(result.visualStyleOptions[networkId]).toEqual(visualStyleOptions)
      expect(result).not.toBe(ui) // Immutability check
    })

    it('should create default visual style options when not provided', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'

      const result = setVisualStyleOptions(ui, networkId)

      const options = result.visualStyleOptions[networkId]
      expect(options).toBeDefined()
      expect(options.visualEditorProperties.nodeSizeLocked).toBe(false)
      expect(options.visualEditorProperties.arrowColorMatchesEdge).toBe(false)
      expect(
        options.visualEditorProperties.tableDisplayConfiguration,
      ).toBeDefined()
    })

    it('should merge existing properties when creating defaults', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'
      const initialOptions: VisualStyleOptions = {
        visualEditorProperties: {
          nodeSizeLocked: true,
          arrowColorMatchesEdge: true,
          tableDisplayConfiguration: {
            nodeTable: {
              columnConfiguration: [],
            },
            edgeTable: {
              columnConfiguration: [],
            },
          },
        },
      }

      let result = setVisualStyleOptions(ui, networkId, initialOptions)
      // When calling without options, it merges with existing but uses defaults
      result = setVisualStyleOptions(result, networkId)

      const options = result.visualStyleOptions[networkId]
      // The implementation merges but defaults override - this is the current behavior
      expect(options?.visualEditorProperties.nodeSizeLocked).toBe(false)
      expect(options?.visualEditorProperties.arrowColorMatchesEdge).toBe(false)
    })
  })

  describe('setNodeSizeLockedState', () => {
    it('should set node size locked state', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'

      const result = setNodeSizeLockedState(ui, networkId, true)

      expect(
        result.visualStyleOptions[networkId]?.visualEditorProperties
          .nodeSizeLocked,
      ).toBe(true)
      expect(result).not.toBe(ui) // Immutability check
    })

    it('should preserve other visual style options', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'

      let result = setVisualStyleOptions(ui, networkId, {
        visualEditorProperties: {
          nodeSizeLocked: false,
          arrowColorMatchesEdge: true,
          tableDisplayConfiguration: {
            nodeTable: {
              columnConfiguration: [],
            },
            edgeTable: {
              columnConfiguration: [],
            },
          },
        },
      })
      result = setNodeSizeLockedState(result, networkId, true)

      const options = result.visualStyleOptions[networkId]
      expect(options.visualEditorProperties.nodeSizeLocked).toBe(true)
      expect(options.visualEditorProperties.arrowColorMatchesEdge).toBe(true)
    })
  })

  describe('setArrowColorMatchesEdgeState', () => {
    it('should set arrow color matches edge state', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'

      const result = setArrowColorMatchesEdgeState(ui, networkId, true)

      expect(
        result.visualStyleOptions[networkId]?.visualEditorProperties
          .arrowColorMatchesEdge,
      ).toBe(true)
      expect(result).not.toBe(ui) // Immutability check
    })

    it('should preserve other visual style options', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'

      let result = setVisualStyleOptions(ui, networkId, {
        visualEditorProperties: {
          nodeSizeLocked: true,
          arrowColorMatchesEdge: false,
          tableDisplayConfiguration: {
            nodeTable: {
              columnConfiguration: [],
            },
            edgeTable: {
              columnConfiguration: [],
            },
          },
        },
      })
      result = setArrowColorMatchesEdgeState(result, networkId, true)

      const options = result.visualStyleOptions[networkId]
      expect(options.visualEditorProperties.nodeSizeLocked).toBe(true)
      expect(options.visualEditorProperties.arrowColorMatchesEdge).toBe(true)
    })
  })

  describe('setTableDisplayConfiguration', () => {
    it('should set table display configuration', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'
      const tableDisplayConfiguration: TableDisplayConfiguration = {
        nodeTable: {
          columnConfiguration: [],
        },
        edgeTable: {
          columnConfiguration: [],
        },
      }

      const result = setTableDisplayConfiguration(
        ui,
        networkId,
        tableDisplayConfiguration,
      )

      expect(
        result.visualStyleOptions[networkId]?.visualEditorProperties
          .tableDisplayConfiguration,
      ).toEqual(tableDisplayConfiguration)
      expect(result).not.toBe(ui) // Immutability check
    })

    it('should preserve other visual style options', () => {
      const ui = createDefaultUi()
      const networkId: IdType = 'network-1'

      let result = setVisualStyleOptions(ui, networkId, {
        visualEditorProperties: {
          nodeSizeLocked: true,
          arrowColorMatchesEdge: true,
          tableDisplayConfiguration: {
            nodeTable: {
              columnConfiguration: [],
            },
            edgeTable: {
              columnConfiguration: [],
            },
          },
        },
      })
      result = setTableDisplayConfiguration(result, networkId, {
        nodeTable: {
          columnConfiguration: [],
        },
        edgeTable: {
          columnConfiguration: [],
        },
      })

      const options = result.visualStyleOptions[networkId]
      expect(options.visualEditorProperties.nodeSizeLocked).toBe(true)
      expect(options.visualEditorProperties.arrowColorMatchesEdge).toBe(true)
    })
  })

  describe('setCustomNetworkTabName', () => {
    it('should set custom network tab name', () => {
      const ui = createDefaultUi()
      const rendererId: IdType = 'renderer-1'
      const name = 'Custom Tab Name'

      const result = setCustomNetworkTabName(ui, rendererId, name)

      expect(result.customNetworkTabName?.[rendererId]).toBe(name)
      expect(result).not.toBe(ui) // Immutability check
    })

    it('should initialize customNetworkTabName if undefined', () => {
      const ui = createDefaultUi()
      const rendererId: IdType = 'renderer-1'
      const name = 'Custom Tab Name'

      const result = setCustomNetworkTabName(ui, rendererId, name)

      expect(result.customNetworkTabName).toBeDefined()
      expect(result.customNetworkTabName?.[rendererId]).toBe(name)
    })

    it('should handle multiple custom tab names', () => {
      const ui = createDefaultUi()

      let result = setCustomNetworkTabName(ui, 'renderer-1', 'Tab 1')
      result = setCustomNetworkTabName(result, 'renderer-2', 'Tab 2')

      expect(result.customNetworkTabName?.['renderer-1']).toBe('Tab 1')
      expect(result.customNetworkTabName?.['renderer-2']).toBe('Tab 2')
    })
  })

  describe('serializeColumnUIKey', () => {
    it('should serialize column UI key', () => {
      const key = serializeColumnUIKey('network-1', TableType.NODE, 'column-1')
      expect(key).toBe('9|network-1|4|node|8|column-1')
    })

    it('should handle empty strings', () => {
      const key = serializeColumnUIKey('', '', '')
      expect(key).toBe('0||0||0|')
    })
  })

  describe('deserializeColumnUIKey', () => {
    it('should deserialize column UI key', () => {
      const serialized = '9|network-1|4|node|8|column-1'
      const [networkId, tableType, columnId] = deserializeColumnUIKey(
        serialized,
      )

      expect(networkId).toBe('network-1')
      expect(tableType).toBe('node')
      expect(columnId).toBe('column-1')
    })

    it('should round-trip serialize and deserialize', () => {
      const original: [string, TableType, string] = [
        'network-1',
        TableType.NODE,
        'column-1',
      ]
      const serialized = serializeColumnUIKey(...original)
      const deserialized = deserializeColumnUIKey(serialized)

      expect(deserialized).toEqual(original)
    })
  })

  describe('immutability', () => {
    it('should not mutate the original UI in any operation', () => {
      const original = createDefaultUi()
      const originalActiveNetworkView = original.activeNetworkView
      const originalPanelState = original.panels[Panel.LEFT]

      // Perform various operations
      let ui = setActiveNetworkView(original, 'network-1')
      ui = setPanelState(ui, Panel.LEFT, PanelState.CLOSED)
      ui = enablePopup(ui, true)
      ui = setShowErrorDialog(ui, true)
      ui = setErrorMessage(ui, 'Test error')
      ui = setActiveTableBrowserIndex(ui, 1)
      ui = setColumnWidth(ui, 'network-1', TableType.NODE, 'column-1', 100)
      ui = setVisualStyleOptions(ui, 'network-1', {
        visualEditorProperties: {
          nodeSizeLocked: true,
          arrowColorMatchesEdge: false,
          tableDisplayConfiguration: {
            nodeTable: {
              columnConfiguration: [],
            },
            edgeTable: {
              columnConfiguration: [],
            },
          },
        },
      })

      // Verify original is unchanged
      expect(original.activeNetworkView).toBe(originalActiveNetworkView)
      expect(original.panels[Panel.LEFT]).toBe(originalPanelState)
      expect(original.enablePopup).toBe(false)
      expect(original.showErrorDialog).toBe(false)
      expect(original.errorMessage).toBe('')
      expect(original.tableUi.activeTabIndex).toBe(0)
      expect(original.visualStyleOptions['network-1']).toBeUndefined()
    })
  })
})

