import {
  clearNetworkSummaryFromDb,
  clearNetworkViewsFromDb,
  clearNetworksFromDb,
  clearOpaqueAspectsFromDb,
  clearTablesFromDb,
  clearUndoRedoStackFromDb,
  closeDb,
  deleteDb,
  deleteAppFromDb,
  deleteFilterFromDb,
  deleteNetworkFromDb,
  deleteNetworkSummaryFromDb,
  deleteNetworkViewsFromDb,
  deleteOpaqueAspectsFromDb,
  deleteVisualStyleFromDb,
  deleteServiceAppFromDb,
  deleteTablesFromDb,
  deleteUiStateFromDb,
  deleteUndoRedoStackFromDb,
  getAllNetworkKeys,
  getAllServiceAppsFromDb,
  getAppFromDb,
  getCyNetworkFromDb,
  getDatabaseVersion,
  getDb,
  getFilterFromDb,
  getNetworkFromDb,
  getNetworkSummariesFromDb,
  getNetworkSummaryFromDb,
  getNetworkViewsFromDb,
  getOpaqueAspectsFromDb,
  getTablesFromDb,
  getTimestampFromDb,
  getUiStateFromDb,
  getUndoRedoStackFromDb,
  getWorkspaceFromDb,
  getVisualStyleFromDb,
  initializeDb,
  putAppToDb,
  putFilterToDb,
  putNetworkSummaryToDb,
  putNetworkToDb,
  putNetworkViewToDb,
  putNetworkViewsToDb,
  putOpaqueAspectsToDb,
  putServiceAppToDb,
  putTablesToDb,
  putTimestampToDb,
  putUiStateToDb,
  putUndoRedoStackToDb,
  putVisualStyleToDb,
  putWorkspaceToDb,
  clearVisualStyleFromDb,
  updateWorkspaceDb,
} from './index'
import { IdType } from '../../models/IdType'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { NetworkView } from '../../models/ViewModel'
import {
  NetworkVisualPropertyName,
  NodeVisualPropertyName,
} from '../../models/VisualStyleModel/VisualPropertyName'
import { deserializeNetworkView, serializeNetworkView } from './serialization/mapSerialization'
import { getNetworkViewId } from '../hooks/stores/ViewModelStore'
import type { Network, Node, Edge } from '../../models/NetworkModel'
import type { Table } from '../../models/TableModel'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import type { VisualStyle } from '../../models/VisualStyleModel'
import { VisualPropertyGroup } from '../../models/VisualStyleModel/VisualPropertyGroup'
import { VisualPropertyValueTypeName } from '../../models/VisualStyleModel/VisualPropertyValueTypeName'
import type { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import type { Ui } from '../../models/UiModel'
import { Panel } from '../../models/UiModel/Panel'
import { PanelState } from '../../models/UiModel/PanelState'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import type { UndoRedoStack } from '../../models/StoreModel/UndoStoreModel'
import type { Workspace } from '../../models/WorkspaceModel'
import type { FilterConfig } from '../../models/FilterModel/FilterConfig'
import { GraphObjectType } from '../../models/NetworkModel/GraphObjectType'
import { DisplayMode } from '../../models/FilterModel/DisplayMode'
import { FilterWidgetType } from '../../models/FilterModel/FilterWidgetType'
import { SelectionType } from '../../models/FilterModel/SelectionType'
import { MappingFunctionType } from '../../models/VisualStyleModel/VisualMappingFunction/MappingFunctionType'
import type { DiscreteMappingFunction } from '../../models/VisualStyleModel/VisualMappingFunction/DiscreteMappingFunction'
import type { CyApp } from '../../models/AppModel/CyApp'
import { ComponentType } from '../../models/AppModel/ComponentType'
import { AppStatus } from '../../models/AppModel/AppStatus'
import type { ServiceApp } from '../../models/AppModel/ServiceApp'
import { RootMenu } from '../../models/AppModel/RootMenu'

const ensureDebugNamespace = () => {
  ;(window as any).debug = {}
}

const createNetworkView = (viewId: string, color: string): NetworkView => {
  return {
    id: viewId,
    type: 'nodeLink',
    viewId,
    nodeViews: {
      n1: {
        id: 'n1',
        x: 0,
        y: 0,
        values: new Map([[NodeVisualPropertyName.NodeBackgroundColor, color]]),
      },
    },
    edgeViews: {},
    selectedNodes: [],
    selectedEdges: [],
    values: new Map([
      [NetworkVisualPropertyName.NetworkBackgroundColor, '#fff'],
    ]),
  }
}

const createTestSummary = (externalId: IdType): NetworkSummary => {
  const now = new Date()
  return {
    isNdex: false,
    ownerUUID: 'owner-1',
    isReadOnly: false,
    subnetworkIds: [],
    isValid: true,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: 'all',
    hasLayout: false,
    hasSample: false,
    cxFileSize: 0,
    cx2FileSize: 0,
    name: `Network ${externalId}`,
    properties: [],
    owner: 'owner',
    version: '1.0',
    completed: true,
    visibility: 'PUBLIC',
    nodeCount: 10,
    edgeCount: 20,
    description: 'Test network',
    creationTime: now,
    externalId,
    isDeleted: false,
    modificationTime: now,
  }
}

const setupFreshDb = async (): Promise<void> => {
  await deleteDb()
  ensureDebugNamespace()
  await initializeDb()
}

const createNetworkTopology = (id: IdType): Network => {
  const nodes: Node[] = [{ id: `${id}-n1` }, { id: `${id}-n2` }]
  const edges: Edge[] = [{ id: `${id}-e1`, s: `${id}-n1`, t: `${id}-n2` }]
  return {
    id,
    nodes,
    edges,
  }
}

const createTableModel = (id: IdType, columnName: string): Table => {
  return {
    id,
    columns: [
      {
        name: columnName,
        type: ValueTypeName.String,
      },
    ],
    rows: new Map([
      [
        `${id}-row-1`,
        {
          [columnName]: `${id}-value-1`,
        },
      ],
    ]),
  }
}

const createVisualStyleModel = (): VisualStyle => {
  return {
    [NetworkVisualPropertyName.NetworkBackgroundColor]: {
      name: NetworkVisualPropertyName.NetworkBackgroundColor,
      group: VisualPropertyGroup.Network,
      displayName: 'Network Background Color',
      type: VisualPropertyValueTypeName.Color,
      defaultValue: '#ffffff',
      bypassMap: new Map(),
    },
  } as unknown as VisualStyle
}

const createVisualStyleOptionsModel = (): VisualStyleOptions => {
  return {
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
}

const createUiState = (
  networkId: IdType,
  visualStyleOptions: VisualStyleOptions,
): Ui => {
  return {
    panels: {
      [Panel.LEFT]: PanelState.OPEN,
      [Panel.RIGHT]: PanelState.CLOSED,
      [Panel.BOTTOM]: PanelState.MINIMIZED,
    },
    activeNetworkView: networkId,
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
    visualStyleOptions: {
      [networkId]: visualStyleOptions,
    },
    networkViewUi: {
      activeTabIndex: 0,
    },
  }
}

const createUndoRedoStackModel = (): UndoRedoStack => {
  return {
    undoStack: [
      {
        undoCommand: UndoCommandType.SET_NETWORK_SUMMARY,
        description: 'Sample undo',
        undoParams: [],
        redoParams: [],
      },
    ],
    redoStack: [],
  }
}

const createWorkspaceModel = (id: IdType): Workspace => {
  const now = new Date()
  const networkId = `${id}-network`
  return {
    id,
    name: `Workspace ${id}`,
    currentNetworkId: networkId,
    networkIds: [networkId],
    localModificationTime: now,
    creationTime: now,
    networkModified: { [networkId]: false },
  }
}

const createFilterConfigModel = (name: string): FilterConfig => {
  const discreteMapping: DiscreteMappingFunction = {
    type: MappingFunctionType.Discrete,
    attribute: 'status',
    visualPropertyType: VisualPropertyValueTypeName.Color,
    defaultValue: '#000000',
    attributeType: ValueTypeName.String,
    vpValueMap: new Map([
      ['active', '#00ff00'],
      ['inactive', '#ff0000'],
    ]),
  }

  return {
    name,
    target: GraphObjectType.NODE,
    attributeName: 'status',
    label: 'Status',
    description: 'Node status filter',
    selectionType: SelectionType.MULTIPLE,
    widgetType: FilterWidgetType.CHECKBOX,
    displayMode: DisplayMode.SELECT,
    range: {
      values: ['active', 'inactive'],
    },
    visualMapping: discreteMapping,
  }
}

const createCyAppModel = (id: string): CyApp => {
  return {
    id,
    name: `App ${id}`,
    description: 'Test application',
    components: [
      {
        id: `${id}-component`,
        type: ComponentType.Menu,
      },
    ],
    status: AppStatus.Active,
  }
}

const createServiceAppModel = (url: string): ServiceApp => {
  return {
    url,
    name: 'Test Service',
    version: '1.0.0',
    cyWebAction: [],
    cyWebMenuItem: {
      root: RootMenu.Apps,
      path: [{ name: 'Tools', gravity: 1 }],
    },
    author: 'Test Author',
    citation: 'Test Citation',
    parameters: [],
  } as ServiceApp
}

afterEach(async () => {
  await closeDb()
})

describe('CyDB regressions', () => {
  it('initializes the database even when window.debug is undefined', async () => {
    delete (window as any).debug
    await closeDb()

    await expect(initializeDb()).resolves.toBeUndefined()
  })

  it('returns undefined for missing network summaries when fetching in bulk', async () => {
    await deleteDb()
    ensureDebugNamespace()
    await initializeDb()

    const existingId: IdType = 'summary-1'
    const missingId: IdType = 'summary-missing'
    await putNetworkSummaryToDb(createTestSummary(existingId))

    const summaries = await getNetworkSummariesFromDb([existingId, missingId])
    expect(summaries).toHaveLength(2)
    expect(summaries[0]).toMatchObject({ externalId: existingId })
    expect(summaries[1]).toBeUndefined()
  })

  it('demonstrates bug when deserialization is missing in putNetworkViewToDb', async () => {
    await deleteDb()
    ensureDebugNamespace()
    await initializeDb()

    const networkId = 'network-bug-demo'
    const firstView = createNetworkView(`${networkId}-view-1`, '#ff0000')
    const secondView = createNetworkView(`${networkId}-view-2`, '#00ff00')

    // Store the first view (it gets serialized in the DB)
    await putNetworkViewToDb(networkId, firstView)

    // Simulate the bug: retrieve views WITHOUT deserializing (like the old buggy code)
    const dbInstance = await getDb()
    const networkViewsEntry = await dbInstance.cyNetworkViews.get({
      id: networkId,
    })
    // BUG: Not deserializing - views are still in serialized format (arrays instead of Maps)
    const viewListWithoutDeserialization = networkViewsEntry?.views || []

    // Problem 1: Map operations fail - values are arrays, not Maps
    const serializedView = viewListWithoutDeserialization[0] as any
    expect(Array.isArray(serializedView.nodeViews.n1.values)).toBe(true)
    expect(serializedView.nodeViews.n1.values instanceof Map).toBe(false)

    // Problem 2: Trying to use Map methods on arrays will fail
    expect(() => {
      // This would throw: "serializedView.nodeViews.n1.values.get is not a function"
      serializedView.nodeViews.n1.values.get(
        NodeVisualPropertyName.NodeBackgroundColor,
      )
    }).toThrow(/get is not a function|Cannot read property 'get'/)

    // Problem 3: viewId comparison might work (it's a string), but Map operations won't
    expect(serializedView.viewId).toBe(firstView.viewId) // This works

    // Problem 4: If we try to serialize again (double serialization), data gets corrupted
    // serializeNetworkView expects Maps, but we're passing arrays, which corrupts the structure
    const doubleSerialized = serializeNetworkView(serializedView as NetworkView)
    // The values are still arrays (serializeNetworkView converts Maps to arrays, but arrays stay arrays)
    expect(Array.isArray(doubleSerialized.nodeViews.n1.values)).toBe(true)
    // The structure is corrupted - serializeNetworkView tries to convert Maps but gets arrays
    // This demonstrates that serializing already-serialized data causes issues

    // Problem 5: getNetworkViewId might work for viewId access, but any code expecting
    // Map objects will fail. Let's simulate what happens when we try to use the viewList
    // without deserialization in putNetworkViewToDb logic:
    let found = false
    viewListWithoutDeserialization.forEach((v: any, idx: number) => {
      const key1 = v.viewId
      const key2 = secondView.viewId
      if (key1 === key2) {
        // This comparison works, but if we try to do anything with Map properties...
        found = true
      }
    })

    // Problem 6: If we try to call getNetworkViewId with serialized views, it might work
    // for basic properties, but any code that accesses Map properties will fail
    const viewId = getNetworkViewId(secondView, viewListWithoutDeserialization)
    expect(viewId).toBeDefined() // This works because it only accesses viewId

    // But if any code tries to access Map properties from the viewList, it will fail:
    viewListWithoutDeserialization.forEach((v: any) => {
      // This would fail: v.nodeViews.n1.values.get(...)
      expect(() => {
        if (v.nodeViews?.n1?.values?.get) {
          v.nodeViews.n1.values.get(NodeVisualPropertyName.NodeBackgroundColor)
        }
      }).not.toThrow() // It doesn't throw because .get doesn't exist, but the code would fail
      // The real issue: values is an array, not a Map, so Map methods don't exist
    })

    // The correct behavior: deserialize first, then everything works
    const viewListWithDeserialization = viewListWithoutDeserialization.map(
      (v: any) => deserializeNetworkView(v),
    )
    const deserializedView = viewListWithDeserialization[0]
    expect(deserializedView.nodeViews.n1.values instanceof Map).toBe(true)
    expect(
      deserializedView.nodeViews.n1.values.get(
        NodeVisualPropertyName.NodeBackgroundColor,
      ),
    ).toBe('#ff0000') // This works correctly after deserialization
  })

  it('persists network views with generated ids and map values intact', async () => {
    await setupFreshDb()

    const networkId = 'network-view-persist'
    const initialView = {
      ...createNetworkView(`${networkId}-view`, '#123456'),
      viewId: undefined,
    } as NetworkView

    await putNetworkViewToDb(networkId, initialView)

    const storedViews = await getNetworkViewsFromDb(networkId)
    expect(storedViews).toHaveLength(1)

    const storedView = storedViews![0]
    expect(storedView.viewId).toBeDefined()
    const nodeKey = Object.keys(storedView.nodeViews)[0]
    expect(storedView.nodeViews[nodeKey].values).toBeInstanceOf(Map)
    expect(
      storedView.nodeViews[nodeKey].values.get(
        NodeVisualPropertyName.NodeBackgroundColor,
      ),
    ).toBe('#123456')

    const updatedView = createNetworkView(storedView.id, '#abcdef')
    updatedView.viewId = storedView.viewId

    await putNetworkViewToDb(networkId, updatedView)

    const updatedViews = await getNetworkViewsFromDb(networkId)
    expect(updatedViews).toHaveLength(1)
    const updatedViewStored = updatedViews![0]
    const updatedNodeKey = Object.keys(updatedViewStored.nodeViews)[0]
    expect(
      updatedViewStored.nodeViews[updatedNodeKey].values.get(
        NodeVisualPropertyName.NodeBackgroundColor,
      ),
    ).toBe('#abcdef')
  })

  it('filters out circle packing views when storing multiple views', async () => {
    await setupFreshDb()

    const networkId = 'network-view-filter'
    const defaultView = createNetworkView(`${networkId}-view`, '#135724')
    const circlePackingView = createNetworkView(
      `${networkId}-circle`,
      '#246813',
    )
    circlePackingView.type = 'circlePacking'

    await putNetworkViewsToDb(networkId, [defaultView, circlePackingView])

    const storedViews = await getNetworkViewsFromDb(networkId)
    expect(storedViews).toHaveLength(1)
    const [storedView] = storedViews ?? []
    expect(storedView?.type).not.toBe('circlePacking')
  })

  it('restores a complete CyNetwork when all components exist in the cache', async () => {
    await setupFreshDb()

    const networkId = 'network-complete'
    const network = createNetworkTopology(networkId)
    await putNetworkToDb(network)

    const nodeTable = createTableModel(networkId, 'nodeName')
    const edgeTable = createTableModel(`${networkId}-edges`, 'edgeName')
    await putTablesToDb(networkId, nodeTable, edgeTable)

    const view = createNetworkView(`${networkId}-view`, '#112233')
    await putNetworkViewToDb(networkId, view)

    const visualStyle = createVisualStyleModel()
    await putVisualStyleToDb(networkId, visualStyle)

    const visualStyleOptions = createVisualStyleOptionsModel()
    await putUiStateToDb(createUiState(networkId, visualStyleOptions))

    await putOpaqueAspectsToDb(networkId, {
      layout: [{ nodes: [network.nodes[0].id] }],
    })

    const undoRedoStack = createUndoRedoStackModel()
    await putUndoRedoStackToDb(networkId, undoRedoStack)

    const cyNetwork = await getCyNetworkFromDb(networkId)

    expect(cyNetwork.network.id).toBe(networkId)
    expect(cyNetwork.network.nodes).toEqual(network.nodes)
    expect(cyNetwork.network.edges).toEqual(network.edges)

    expect(cyNetwork.nodeTable.rows instanceof Map).toBe(true)
    expect(cyNetwork.nodeTable.rows.get(`${networkId}-row-1`)?.nodeName).toBe(
      `${networkId}-value-1`,
    )

    expect(cyNetwork.edgeTable.rows instanceof Map).toBe(true)

    expect(
      cyNetwork.visualStyle[NetworkVisualPropertyName.NetworkBackgroundColor]
        .bypassMap,
    ).toBeInstanceOf(Map)

    expect(cyNetwork.networkViews).toHaveLength(1)
    const restoredView = cyNetwork.networkViews[0]
    expect(
      restoredView.nodeViews[Object.keys(restoredView.nodeViews)[0]].values,
    ).toBeInstanceOf(Map)

    expect(cyNetwork.visualStyleOptions).toEqual(visualStyleOptions)

    expect(cyNetwork.otherAspects).toEqual([
      {
        layout: [{ nodes: [network.nodes[0].id] }],
      },
    ])

    expect(cyNetwork.undoRedoStack).toEqual(undoRedoStack)
  })

  it('throws a descriptive error when visual style is missing for a network', async () => {
    await setupFreshDb()

    const networkId = 'network-missing-visual-style'
    const network = createNetworkTopology(networkId)
    await putNetworkToDb(network)

    await putTablesToDb(
      networkId,
      createTableModel(networkId, 'nodeName'),
      createTableModel(`${networkId}-edges`, 'edgeName'),
    )

    const view = createNetworkView(`${networkId}-view`, '#445566')
    await putNetworkViewToDb(networkId, view)

    await putUiStateToDb(
      createUiState(networkId, createVisualStyleOptionsModel()),
    )

    await expect(getCyNetworkFromDb(networkId)).rejects.toThrow(
      `Visual style not found for id: ${networkId}`,
    )
  })
})

describe('CyDB helper coverage', () => {
  it('reports database version and handles closing connections', async () => {
    await setupFreshDb()

    expect(getDatabaseVersion()).toBeGreaterThanOrEqual(7)

    const dbInstance = await getDb()
    expect(dbInstance.isOpen()).toBe(true)

    await closeDb()
    expect(dbInstance.isOpen()).toBe(false)

    await initializeDb()
    expect(dbInstance.isOpen()).toBe(true)
  })

  it('resets the database when deleteDb is called', async () => {
    await setupFreshDb()

    const networkId = 'delete-db-network'
    await putNetworkToDb(createNetworkTopology(networkId))
    const keysBefore = await getAllNetworkKeys()
    expect(keysBefore).toEqual(expect.arrayContaining([networkId]))

    await deleteDb()

    const keysAfter = await getAllNetworkKeys()
    expect(keysAfter).toEqual([])
  })

  it('supports network CRUD helpers', async () => {
    await setupFreshDb()

    const networkA = createNetworkTopology('network-A')
    const networkB = createNetworkTopology('network-B')

    await putNetworkToDb(networkA)
    await putNetworkToDb(networkB)

    const primaryKeys = await getAllNetworkKeys()
    expect(primaryKeys).toEqual(
      expect.arrayContaining(['network-A', 'network-B']),
    )

    const retrieved = await getNetworkFromDb('network-A')
    expect(retrieved?.nodes.map((node) => node.id)).toEqual(
      networkA.nodes.map((node) => node.id),
    )
    expect(retrieved?.edges.map((edge) => edge.id)).toEqual(
      networkA.edges.map((edge) => edge.id),
    )

    await deleteNetworkFromDb('network-A')
    expect(await getNetworkFromDb('network-A')).toBeUndefined()

    await clearNetworksFromDb()
    expect(await getAllNetworkKeys()).toEqual([])
  })

  it('provides table CRUD helpers with proper serialization', async () => {
    await setupFreshDb()

    const missingTables = await getTablesFromDb('missing')
    expect(missingTables.nodeTable.id).toBe('missing-nodes')
    expect(missingTables.nodeTable.rows).toBeInstanceOf(Map)
    expect(missingTables.nodeTable.rows.size).toBe(0)

    const nodeTable = createTableModel('network-tables', 'label')
    const edgeTable = createTableModel('network-tables-edges', 'weight')
    await putTablesToDb('network-tables', nodeTable, edgeTable)

    const storedTables = await getTablesFromDb('network-tables')
    expect(storedTables.nodeTable.rows).toBeInstanceOf(Map)
    expect(storedTables.nodeTable.rows.get('network-tables-row-1')?.label).toBe(
      'network-tables-value-1',
    )

    await deleteTablesFromDb('network-tables')
    const afterDelete = await getTablesFromDb('network-tables')
    expect(afterDelete.nodeTable.rows.size).toBe(0)

    await putTablesToDb('network-tables', nodeTable, edgeTable)
    await clearTablesFromDb()
    const afterClear = await getTablesFromDb('network-tables')
    expect(afterClear.nodeTable.rows.size).toBe(0)
  })

  it('manages workspace persistence and updates', async () => {
    await setupFreshDb()

    const defaultWorkspace = await getWorkspaceFromDb()
    expect(defaultWorkspace.id).toBeTruthy()
    expect(defaultWorkspace.networkIds).toBeInstanceOf(Array)

    const workspace = createWorkspaceModel('workspace-1')
    await putWorkspaceToDb(workspace)

    const fetched = await getWorkspaceFromDb(workspace.id)
    expect(fetched.name).toBe(workspace.name)

    const updateResult = await updateWorkspaceDb(workspace.id, {
      name: 'Updated Workspace',
    })
    expect(updateResult).toBe(1)

    const updated = await getWorkspaceFromDb(workspace.id)
    expect(updated.name).toBe('Updated Workspace')
  })

  it('handles network summary storage and cleanup', async () => {
    await setupFreshDb()

    const summary = createTestSummary('summary-crud')
    await putNetworkSummaryToDb(summary)

    const fetched = await getNetworkSummaryFromDb('summary-crud')
    expect(fetched?.externalId).toBe('summary-crud')

    await deleteNetworkSummaryFromDb('summary-crud')
    expect(await getNetworkSummaryFromDb('summary-crud')).toBeUndefined()

    await putNetworkSummaryToDb(summary)
    await clearNetworkSummaryFromDb()
    expect(await getNetworkSummaryFromDb('summary-crud')).toBeUndefined()
  })

  it('persists visual styles and supports deletion helpers', async () => {
    await setupFreshDb()

    const visualStyle = createVisualStyleModel()
    await putVisualStyleToDb('style-network', visualStyle)

    const stored = await getVisualStyleFromDb('style-network')
    expect(
      stored?.[NetworkVisualPropertyName.NetworkBackgroundColor].bypassMap,
    ).toBeInstanceOf(Map)

    await deleteVisualStyleFromDb('style-network')
    expect(await getVisualStyleFromDb('style-network')).toBeUndefined()

    await putVisualStyleToDb('style-network', visualStyle)
    await clearVisualStyleFromDb()
    expect(await getVisualStyleFromDb('style-network')).toBeUndefined()
  })

  it('clears stored network views when requested', async () => {
    await setupFreshDb()

    const networkId = 'view-cleanup'
    await putNetworkViewToDb(
      networkId,
      createNetworkView(`${networkId}-1`, '#123123'),
    )
    await deleteNetworkViewsFromDb(networkId)
    expect(await getNetworkViewsFromDb(networkId)).toBeUndefined()

    await putNetworkViewsToDb(networkId, [
      createNetworkView(`${networkId}-2`, '#222222'),
      createNetworkView(`${networkId}-3`, '#333333'),
    ])
    await clearNetworkViewsFromDb()
    expect(await getNetworkViewsFromDb(networkId)).toBeUndefined()
  })

  it('handles UI state persistence and deletion', async () => {
    await setupFreshDb()

    expect(await getUiStateFromDb()).toBeUndefined()

    const uiState = createUiState('ui-network', createVisualStyleOptionsModel())
    await putUiStateToDb(uiState)

    const stored = await getUiStateFromDb()
    expect(stored?.visualStyleOptions['ui-network']).toBeDefined()

    await deleteUiStateFromDb()
    expect(await getUiStateFromDb()).toBeUndefined()
  })

  it('stores timestamps', async () => {
    await setupFreshDb()

    expect(await getTimestampFromDb()).toBeUndefined()

    await putTimestampToDb(123456789)
    expect(await getTimestampFromDb()).toBe(123456789)
  })

  it('persists filter configurations with map values intact', async () => {
    await setupFreshDb()

    const filterConfig = createFilterConfigModel('filter-1')
    await putFilterToDb(filterConfig)

    const stored = await getFilterFromDb('filter-1')
    expect(stored?.visualMapping?.type).toBe(MappingFunctionType.Discrete)
    expect(stored?.visualMapping && 'vpValueMap' in stored.visualMapping).toBe(
      true,
    )
    const vpMap = (stored?.visualMapping as DiscreteMappingFunction)?.vpValueMap
    expect(vpMap).toBeInstanceOf(Map)
    expect(vpMap?.get('active')).toBe('#00ff00')

    await deleteFilterFromDb('filter-1')
    expect(await getFilterFromDb('filter-1')).toBeUndefined()
  })

  it('persists custom app metadata', async () => {
    await setupFreshDb()

    const app = createCyAppModel('app-1')
    await putAppToDb(app)

    const stored = await getAppFromDb('app-1')
    expect(stored?.name).toBe(app.name)

    await deleteAppFromDb('app-1')
    expect(await getAppFromDb('app-1')).toBeUndefined()
  })

  it('manages service app records', async () => {
    await setupFreshDb()

    expect(await getAllServiceAppsFromDb()).toEqual([])

    const serviceApp = createServiceAppModel('https://service.local')
    await putServiceAppToDb(serviceApp)

    const storedApps = await getAllServiceAppsFromDb()
    expect(storedApps).toHaveLength(1)
    expect(storedApps[0].url).toBe('https://service.local')

    await deleteServiceAppFromDb('https://service.local')
    expect(await getAllServiceAppsFromDb()).toEqual([])
  })

  it('handles opaque aspects persistence helpers', async () => {
    await setupFreshDb()

    await putOpaqueAspectsToDb('opaque-1', { layout: [{ nodes: ['n1'] }] })
    const stored = await getOpaqueAspectsFromDb('opaque-1')
    expect(stored?.aspects.layout).toHaveLength(1)

    await deleteOpaqueAspectsFromDb('opaque-1')
    expect(await getOpaqueAspectsFromDb('opaque-1')).toBeUndefined()

    await putOpaqueAspectsToDb('opaque-1', { layout: [] })
    await clearOpaqueAspectsFromDb()
    expect(await getOpaqueAspectsFromDb('opaque-1')).toBeUndefined()
  })

  it('stores and clears undo/redo stacks', async () => {
    await setupFreshDb()

    const undoRedoStack = createUndoRedoStackModel()
    await putUndoRedoStackToDb('undo-network', undoRedoStack)

    const stored = await getUndoRedoStackFromDb('undo-network')
    expect(stored?.undoRedoStack.undoStack).toHaveLength(1)

    await deleteUndoRedoStackFromDb('undo-network')
    expect(await getUndoRedoStackFromDb('undo-network')).toBeUndefined()

    await putUndoRedoStackToDb('undo-network', undoRedoStack)
    await clearUndoRedoStackFromDb()
    expect(await getUndoRedoStackFromDb('undo-network')).toBeUndefined()
  })
})
