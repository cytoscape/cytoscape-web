import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getTabId } from '@/data/tabState/tabId'

import { logDb } from '../../debug'

import { AppStatus } from '../../models/AppModel/AppStatus'
import { ComponentType } from '../../models/AppModel/ComponentType'
import type { CyApp } from '../../models/AppModel/CyApp'
import { RootMenu } from '../../models/AppModel/RootMenu'
import type { ServiceApp } from '../../models/AppModel/ServiceApp'
import { DisplayMode } from '../../models/FilterModel/DisplayMode'
import type { FilterConfig } from '../../models/FilterModel/FilterConfig'
import { FilterWidgetType } from '../../models/FilterModel/FilterWidgetType'
import { SelectionType } from '../../models/FilterModel/SelectionType'
import { IdType } from '../../models/IdType'
import type { Edge, Network, Node } from '../../models/NetworkModel'
import { GraphObjectType } from '../../models/NetworkModel/GraphObjectType'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import type { UndoRedoStack } from '../../models/StoreModel/UndoStoreModel'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import type { Table } from '../../models/TableModel'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import type { Ui } from '../../models/UiModel'
import { Panel } from '../../models/UiModel/Panel'
import { PanelState } from '../../models/UiModel/PanelState'
import { NetworkView } from '../../models/ViewModel'
import type {
  VisualStyle,
  VisualStyleSet,
} from '../../models/VisualStyleModel'
import type { DiscreteMappingFunction } from '../../models/VisualStyleModel/VisualMappingFunction/DiscreteMappingFunction'
import { MappingFunctionType } from '../../models/VisualStyleModel/VisualMappingFunction/MappingFunctionType'
import { VisualPropertyGroup } from '../../models/VisualStyleModel/VisualPropertyGroup'
import {
  NetworkVisualPropertyName,
  NodeVisualPropertyName,
} from '../../models/VisualStyleModel/VisualPropertyName'
import { VisualPropertyValueTypeName } from '../../models/VisualStyleModel/VisualPropertyValueTypeName'
import type { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import type { Workspace } from '../../models/WorkspaceModel'
import { getNetworkViewId } from '../hooks/stores/ViewModelStore'
import {
  clearNetworksFromDb,
  clearNetworkSummaryFromDb,
  clearNetworkViewsFromDb,
  clearStyleLibraryFromDb,
  clearOpaqueAspectsFromDb,
  clearTablesFromDb,
  clearUndoRedoStackFromDb,
  clearVisualStyleFromDb,
  closeDb,
  CyNetworkCacheMissError,
  deleteAppFromDb,
  deleteAppSettingFromDb,
  deleteDb,
  deleteFilterFromDb,
  deleteNetworkFromDb,
  deleteNetworkSummaryFromDb,
  deleteNetworkViewsFromDb,
  deleteOpaqueAspectsFromDb,
  deleteServiceAppFromDb,
  deleteStyleTemplateFromDb,
  deleteTablesFromDb,
  deleteUiStateFromDb,
  deleteUndoRedoStackFromDb,
  deleteVisualStyleFromDb,
  getAllNetworkKeys,
  getAllServiceAppsFromDb,
  getAllStyleTemplatesFromDb,
  getAppFromDb,
  getAppSettingFromDb,
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
  getUiStateFromDb,
  getUndoRedoStackFromDb,
  getViewSelectionFromDb,
  getVisualStyleFromDb,
  getStyleSetMetadataFromDb,
  getVisualStyleSetFromDb,
  LEGACY_STYLE_ID,
  getWorkspaceFromDb,
  initializeDb,
  putAppSettingToDb,
  putAppToDb,
  putFilterToDb,
  putNetworkSummaryToDb,
  putNetworkToDb,
  putNetworkViewsToDb,
  putNetworkViewToDb,
  putOpaqueAspectsToDb,
  putServiceAppToDb,
  putStyleTemplateToDb,
  putTablesToDb,
  putUiStateToDb,
  putUndoRedoStackToDb,
  putViewSelectionToDb,
  putVisualStyleSetToDb,
  putVisualStyleToDb,
  putWorkspaceToDb,
  updateWorkspaceDb,
  verifyTransactionSourceStamp,
} from './index'
import {
  deserializeNetworkView,
  serializeNetworkView,
  serializeVisualStyle,
} from './serialization/mapSerialization'

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
    cyWebActions: [],
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

    // Typed as a cache miss, not a generic failure: useLoadCyNetwork only
    // falls back to the in-memory stores for this class of error.
    await expect(getCyNetworkFromDb(networkId)).rejects.toThrow(
      CyNetworkCacheMissError,
    )
    await expect(getCyNetworkFromDb(networkId)).rejects.toThrow(
      `Visual style not found in IndexedDB for network ${networkId}`,
    )
  })

  it('throws a cache miss when the network has no tables row', async () => {
    await setupFreshDb()

    const networkId = 'network-missing-tables'
    await putNetworkToDb(createNetworkTopology(networkId))

    // No putTablesToDb: the row is absent, not empty. getTablesFromDb() hands
    // out empty defaults here, which would let a half-persisted network restore
    // with no columns instead of falling back to the in-memory stores.
    expect((await getTablesFromDb(networkId)).nodeTable.columns).toEqual([])

    await expect(getCyNetworkFromDb(networkId)).rejects.toThrow(
      CyNetworkCacheMissError,
    )
    await expect(getCyNetworkFromDb(networkId)).rejects.toThrow(
      `Tables not found in IndexedDB for network ${networkId}`,
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

  it('returns the first stored workspace when no id is given and several exist', async () => {
    // Documents the current (index-0) selection behavior of getWorkspaceFromDb.
    // See AMBIGUOUS_DB_CODE.md #5: there is a TODO to pick the newest workspace,
    // but today it returns db.workspace.toArray()[0] (first by primary key).
    await setupFreshDb()

    await putWorkspaceToDb(createWorkspaceModel('ws-a'))
    await putWorkspaceToDb(createWorkspaceModel('ws-b'))

    const selected = await getWorkspaceFromDb()
    expect(selected.id).toBe('ws-a')
  })

  it('falls back to the first workspace when the requested id is unknown', async () => {
    // Documents that an unknown id does not create a new workspace nor return
    // undefined when other workspaces exist - it returns the first one.
    await setupFreshDb()

    await putWorkspaceToDb(createWorkspaceModel('ws-a'))
    await putWorkspaceToDb(createWorkspaceModel('ws-b'))

    const selected = await getWorkspaceFromDb('does-not-exist')
    expect(selected.id).toBe('ws-a')
  })

  it('supports app setting CRUD and returns undefined for missing keys', async () => {
    await setupFreshDb()

    await putAppSettingToDb('theme', { mode: 'dark' })
    expect(await getAppSettingFromDb('theme')).toEqual({ mode: 'dark' })

    // put on an existing key overwrites the stored value
    await putAppSettingToDb('theme', { mode: 'light' })
    expect(await getAppSettingFromDb('theme')).toEqual({ mode: 'light' })

    // reading a key that was never written resolves to undefined
    expect(await getAppSettingFromDb('missing-key')).toBeUndefined()

    await deleteAppSettingFromDb('theme')
    expect(await getAppSettingFromDb('theme')).toBeUndefined()
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

describe('Visual style sets (multiple styles per network)', () => {
  afterEach(async () => {
    await closeDb()
  })

  const createTwoStyleSet = (): VisualStyleSet => {
    const styleA = createVisualStyleModel()
    const styleB = createVisualStyleModel()
    return {
      activeStyleId: 'style-a',
      styles: {
        'style-a': { id: 'style-a', name: 'Main', visualStyle: styleA },
        'style-b': { id: 'style-b', name: 'Publication', visualStyle: styleB },
      },
    }
  }

  it('round-trips a complete style set with Maps restored', async () => {
    await setupFreshDb()
    const styleSet = createTwoStyleSet()
    await putVisualStyleSetToDb('multi-style-network', styleSet)

    const stored = await getVisualStyleSetFromDb('multi-style-network')
    expect(stored).toBeDefined()
    expect(stored?.activeStyleId).toBe('style-a')
    expect(Object.keys(stored?.styles ?? {}).sort()).toEqual([
      'style-a',
      'style-b',
    ])
    expect(stored?.styles['style-b'].name).toBe('Publication')
    expect(
      stored?.styles['style-b'].visualStyle[
        NetworkVisualPropertyName.NetworkBackgroundColor
      ].bypassMap,
    ).toBeInstanceOf(Map)
  })

  it('normalizes legacy single-style rows on read', async () => {
    await setupFreshDb()
    const visualStyle = createVisualStyleModel()

    // Write a pre-v10 row shape directly
    const db = await getDb()
    await db.cyVisualStyles.put({
      id: 'legacy-network',
      visualStyle: serializeVisualStyle(visualStyle),
    })

    const styleSet = await getVisualStyleSetFromDb('legacy-network')
    expect(styleSet).toBeDefined()
    const entries = Object.values(styleSet?.styles ?? {})
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe('Default')
    expect(styleSet?.activeStyleId).toBe(entries[0].id)

    // The active-style compatibility reader works on legacy rows too
    const active = await getVisualStyleFromDb('legacy-network')
    expect(
      active?.[NetworkVisualPropertyName.NetworkBackgroundColor].bypassMap,
    ).toBeInstanceOf(Map)
  })

  it('returns undefined for corrupted rows instead of throwing', async () => {
    await setupFreshDb()
    const db = await getDb()

    // Row with styles but no activeStyleId and no legacy visualStyle
    await db.cyVisualStyles.put({ id: 'corrupt-1', styles: {} })
    expect(await getVisualStyleSetFromDb('corrupt-1')).toBeUndefined()

    // Row with neither shape's required fields
    await db.cyVisualStyles.put({ id: 'corrupt-2' })
    expect(await getVisualStyleSetFromDb('corrupt-2')).toBeUndefined()

    // Set row whose active pointer dangles
    await db.cyVisualStyles.put({
      id: 'corrupt-3',
      activeStyleId: 'missing',
      styles: {},
    })
    expect(await getVisualStyleSetFromDb('corrupt-3')).toBeUndefined()
  })

  it('putVisualStyleToDb preserves inactive styles in an existing set', async () => {
    await setupFreshDb()
    await putVisualStyleSetToDb('preserve-network', createTwoStyleSet())

    const replacement = createVisualStyleModel()
    await putVisualStyleToDb('preserve-network', replacement)

    const stored = await getVisualStyleSetFromDb('preserve-network')
    expect(Object.keys(stored?.styles ?? {}).sort()).toEqual([
      'style-a',
      'style-b',
    ])
    expect(stored?.activeStyleId).toBe('style-a')
    expect(stored?.styles['style-b'].name).toBe('Publication')
  })

  it('putVisualStyleToDb creates a fresh single-style set when no row exists', async () => {
    await setupFreshDb()
    await putVisualStyleToDb('fresh-network', createVisualStyleModel())

    const stored = await getVisualStyleSetFromDb('fresh-network')
    const entries = Object.values(stored?.styles ?? {})
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe('Default')
  })

  describe('getStyleSetMetadataFromDb', () => {
    it('lists names for several networks in one read', async () => {
      await setupFreshDb()
      await putVisualStyleSetToDb('net-1', createTwoStyleSet())
      await putVisualStyleSetToDb('net-2', createTwoStyleSet())

      const metadata = await getStyleSetMetadataFromDb(['net-1', 'net-2'])

      expect(metadata).toHaveLength(2)
      expect(metadata[0].networkId).toBe('net-1')
      expect(metadata[0].activeStyleId).toBe('style-a')
      expect(metadata[0].styles.map((s) => s.name).sort()).toEqual([
        'Main',
        'Publication',
      ])
    })

    it('omits networks with no style row rather than erroring', async () => {
      // A network never opened has no row: its style lives only in the CX2 on
      // the server. Callers use the absence to tell "no styles" from "not local".
      await setupFreshDb()
      await putVisualStyleSetToDb('net-1', createTwoStyleSet())

      const metadata = await getStyleSetMetadataFromDb([
        'net-1',
        'never-opened',
      ])

      expect(metadata.map((m) => m.networkId)).toEqual(['net-1'])
    })

    it('reports a legacy row as a single Default style with the sentinel id', async () => {
      await setupFreshDb()
      const db = await getDb()
      await db.cyVisualStyles.put({
        id: 'legacy-meta-network',
        visualStyle: serializeVisualStyle(createVisualStyleModel()),
      })

      const metadata = await getStyleSetMetadataFromDb(['legacy-meta-network'])

      expect(metadata[0].styles).toEqual([
        { id: LEGACY_STYLE_ID, name: 'Default' },
      ])
      // Entry id and active id agree, so "find by id, else use the active
      // style" resolves correctly even though the real uuid is minted per read.
      expect(metadata[0].activeStyleId).toBe(LEGACY_STYLE_ID)
    })

    it('does not deserialize style content', async () => {
      // The whole point of this reader: names come straight out of the row, so
      // a row whose serialized style is garbage still lists correctly. If this
      // starts failing, the cheap path has grown a parse step.
      await setupFreshDb()
      const db = await getDb()
      await db.cyVisualStyles.put({
        id: 'unparseable-network',
        activeStyleId: 'style-x',
        styles: {
          'style-x': {
            id: 'style-x',
            name: 'Still Listed',
            visualStyle: 'not a serialized style at all' as any,
          },
        },
      })

      const metadata = await getStyleSetMetadataFromDb(['unparseable-network'])

      expect(metadata[0].styles).toEqual([
        { id: 'style-x', name: 'Still Listed' },
      ])
    })

    it('short-circuits on an empty id list', async () => {
      await setupFreshDb()
      expect(await getStyleSetMetadataFromDb([])).toEqual([])
    })
  })
})

describe('Style library persistence', () => {
  afterEach(async () => {
    await closeDb()
  })

  it('supports full CRUD on style templates', async () => {
    await setupFreshDb()

    const template = {
      id: 'template-1',
      name: 'Publication',
      visualStyle: createVisualStyleModel(),
    }
    await putStyleTemplateToDb(template)

    let templates = await getAllStyleTemplatesFromDb()
    expect(templates).toHaveLength(1)
    expect(templates[0].name).toBe('Publication')
    expect(
      templates[0].visualStyle[NetworkVisualPropertyName.NetworkBackgroundColor]
        .bypassMap,
    ).toBeInstanceOf(Map)

    await deleteStyleTemplateFromDb('template-1')
    templates = await getAllStyleTemplatesFromDb()
    expect(templates).toHaveLength(0)

    await putStyleTemplateToDb(template)
    await clearStyleLibraryFromDb()
    expect(await getAllStyleTemplatesFromDb()).toHaveLength(0)
  })
})

// REVIEW.md round-1 P0: db/validator.ts was a complete validation layer
// with zero callers — DB reads returned raw `any`. It is now wired into
// the read path in OBSERVE mode: shape mismatches are logged as warnings
// but the data is always returned unaltered, so corrupt or old-shape rows
// can never brick a workspace. Enforcement can be escalated once field
// warnings are quiet.
describe('read-path validation (observe mode)', () => {
  const validationWarnings = (spy: {
    mock: { calls: unknown[][] }
  }): string[] =>
    spy.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .filter((message: string) => message.includes('validation'))

  it('warns when a workspace read from the DB fails shape validation', async () => {
    await setupFreshDb()
    const db = await getDb()
    // Malformed row: missing name/networkIds/timestamps
    await db.workspace.put({ id: 'malformed-ws' })
    const warnSpy = vi.spyOn(logDb, 'warn')

    const ws = await getWorkspaceFromDb('malformed-ws')

    // Observe mode: data is returned unaltered…
    expect(ws).toBeDefined()
    expect(ws.id).toBe('malformed-ws')
    // …but the mismatch is reported
    expect(validationWarnings(warnSpy).length).toBeGreaterThan(0)
    warnSpy.mockRestore()
  })

  it('does not warn for a well-formed workspace', async () => {
    await setupFreshDb()
    const workspace = createWorkspaceModel('well-formed-ws')
    await putWorkspaceToDb(workspace)
    const warnSpy = vi.spyOn(logDb, 'warn')

    await getWorkspaceFromDb('well-formed-ws')

    expect(validationWarnings(warnSpy)).toEqual([])
    warnSpy.mockRestore()
  })

  // REVIEW.md R2-10 (Safari half): mapSerialization.ts documents that
  // Safari IndexedDB cannot structured-clone Maps, which is why the
  // table/view serializers exist — but undo stacks were stored with raw
  // Maps in their params. They are now encoded to tagged plain objects on
  // write and decoded on read.
  it('stores undo stacks without raw Map instances and decodes them on read (regression: R2-10)', async () => {
    await setupFreshDb()
    await putUndoRedoStackToDb('safari-net', {
      undoStack: [
        {
          undoCommand: 'MOVE_NODES' as any,
          description: 'move',
          undoParams: [new Map([['n1', { x: 1, y: 2 }]])],
          redoParams: [new Map([['n1', { x: 3, y: 4 }]])],
        },
      ],
      redoStack: [],
    })

    // The RAW stored row must be Safari-safe: no Map instances anywhere
    const db = await getDb()
    const rawRow = await db.undoStacks.get({ id: 'safari-net' })
    const containsMap = (value: any): boolean => {
      if (value instanceof Map) return true
      if (Array.isArray(value)) return value.some(containsMap)
      if (value !== null && typeof value === 'object') {
        return Object.values(value).some(containsMap)
      }
      return false
    }
    expect(containsMap(rawRow)).toBe(false)

    // The public read path decodes back to real Maps
    const row = await getUndoRedoStackFromDb('safari-net')
    const param = row?.undoRedoStack?.undoStack[0].undoParams[0]
    expect(param).toBeInstanceOf(Map)
    expect((param as Map<string, any>).get('n1')).toEqual({ x: 1, y: 2 })
  })

  it('warns when an undo stack row fails shape validation but still returns it', async () => {
    await setupFreshDb()
    const db = await getDb()
    await db.undoStacks.put({ id: 'bad-stack', undoRedoStack: 'not a stack' })
    const warnSpy = vi.spyOn(logDb, 'warn')

    const row = await getUndoRedoStackFromDb('bad-stack')

    expect(row).toBeDefined()
    expect(validationWarnings(warnSpy).length).toBeGreaterThan(0)
    warnSpy.mockRestore()
  })
})

/**
 * Guard for the cross-tab origin tag (see `stampTransactionSource` in index.ts).
 *
 * Cross-tab sync ignores changes whose `source` equals this tab's id. If the
 * `_createTransaction` override ever stops firing — e.g. a Dexie upgrade
 * renames the internal — every change would read as foreign and each tab would
 * re-hydrate its own writes, silently reintroducing the echo loop. These tests
 * make that failure loud.
 */
describe('cross-tab change origin tagging', () => {
  it('stamps this tab id onto _changes rows written through the db helpers', async () => {
    await setupFreshDb()
    const db = await getDb()

    await putNetworkSummaryToDb(createTestSummary('origin-net'))

    const changes = await (db as any)._changes.toArray()
    const summaryChanges = changes.filter((c: any) => c.table === 'summaries')

    expect(summaryChanges.length).toBeGreaterThan(0)
    for (const change of summaryChanges) {
      expect(change.source).toBe(getTabId())
    }
  })

  it('does not overwrite a source set explicitly by the caller', async () => {
    await setupFreshDb()
    const db = await getDb()

    await db.transaction('rw', db.summaries, async () => {
      ;(Dexie.currentTransaction as any).source = 'explicit-source'
      await db.summaries.put({ ...createTestSummary('explicit-net') })
    })

    const changes = await (db as any)._changes.toArray()
    const row = changes.find(
      (c: any) => c.table === 'summaries' && c.key === 'explicit-net',
    )

    expect(row?.source).toBe('explicit-source')
  })

  it('self-check reports the stamp as present', async () => {
    await setupFreshDb()

    // The runtime counterpart of the two tests above: `openDatabaseForStartup`
    // calls this on every boot so a broken hook is visible in the field, not
    // just in CI.
    await expect(verifyTransactionSourceStamp()).resolves.toBe(true)
  })

  it('self-check reports failure when the hook stops firing', async () => {
    await setupFreshDb()
    const db = await getDb()

    // Simulate the regression: restore an unpatched _createTransaction.
    const patched = (db as any)._createTransaction
    ;(db as any)._createTransaction = function (...args: unknown[]) {
      const trans = patched.apply(this, args)
      trans.source = undefined
      return trans
    }

    try {
      await expect(verifyTransactionSourceStamp()).resolves.toBe(false)
    } finally {
      ;(db as any)._createTransaction = patched
    }
  })
})

/**
 * DB v11 moved node/edge selection out of the `cyNetworkViews` row into its own
 * `viewSelections` store. Two properties matter: rows written before v11 must
 * still surface their inline selection, and a selection change must not disturb
 * the view row (an identical row produces no dexie-observable change record,
 * which is what stops a click in one tab from replacing every other tab's view
 * model).
 */
describe('view selection storage (DB v11)', () => {
  it('round-trips a selection through its own store', async () => {
    await setupFreshDb()

    expect(await getViewSelectionFromDb('sel-net')).toBeUndefined()

    await putViewSelectionToDb('sel-net', {
      selectedNodes: ['n1', 'n2'],
      selectedEdges: ['e1'],
    })

    expect(await getViewSelectionFromDb('sel-net')).toEqual({
      selectedNodes: ['n1', 'n2'],
      selectedEdges: ['e1'],
    })
  })

  it('merges the stored selection into the views it reads', async () => {
    await setupFreshDb()
    const view = createNetworkView('merge-net-nodeLink-1', 'red')
    await putNetworkViewsToDb('merge-net', [
      { ...view, selectedNodes: [], selectedEdges: [] },
    ])
    await putViewSelectionToDb('merge-net', {
      selectedNodes: ['n1'],
      selectedEdges: ['e1'],
    })

    const views = await getNetworkViewsFromDb('merge-net')

    expect(views?.[0].selectedNodes).toEqual(['n1'])
    expect(views?.[0].selectedEdges).toEqual(['e1'])
  })

  it('falls back to inline selection for rows written before v11', async () => {
    await setupFreshDb()
    const db = await getDb()
    const view = createNetworkView('legacy-net-nodeLink-1', 'blue')
    // Write the row the way v10 did: selection inline, no viewSelections row.
    await db.cyNetworkViews.put({
      id: 'legacy-net',
      views: [
        {
          ...view,
          selectedNodes: ['legacy-n1'],
          selectedEdges: [],
          nodeViews: {},
          edgeViews: {},
          values: [],
        },
      ],
    })

    const views = await getNetworkViewsFromDb('legacy-net')

    expect(views?.[0].selectedNodes).toEqual(['legacy-n1'])
  })

  it('back-fills a pre-v11 inline selection so a later view write cannot erase it', async () => {
    await setupFreshDb()
    const db = await getDb()
    const view = createNetworkView('backfill-net-nodeLink-1', 'blue')
    // A v10 row: selection inline, no viewSelections row.
    await db.cyNetworkViews.put({
      id: 'backfill-net',
      views: [
        {
          ...view,
          selectedNodes: ['keep-n1'],
          selectedEdges: ['keep-e1'],
          nodeViews: {},
          edgeViews: {},
          values: [],
        },
      ],
    })

    // Loading the network reads it, which is the moment the selection must be
    // moved to its new home.
    await getNetworkViewsFromDb('backfill-net')
    expect(await getViewSelectionFromDb('backfill-net')).toEqual({
      selectedNodes: ['keep-n1'],
      selectedEdges: ['keep-e1'],
    })

    // Now any non-selection edit (a node move, a layout) rewrites the view row
    // with selection stripped — `withoutSelection` in ViewModelStore. Without
    // the back-fill above, the inline copy was the ONLY copy and this erased it.
    await putNetworkViewsToDb('backfill-net', [
      { ...view, selectedNodes: [], selectedEdges: [] },
    ])

    const reloaded = await getNetworkViewsFromDb('backfill-net')
    expect(reloaded?.[0].selectedNodes).toEqual(['keep-n1'])
    expect(reloaded?.[0].selectedEdges).toEqual(['keep-e1'])
  })

  it('does not create a selection row for a legacy view with no selection', async () => {
    await setupFreshDb()
    const db = await getDb()
    const view = createNetworkView('empty-sel-net-nodeLink-1', 'blue')
    await db.cyNetworkViews.put({
      id: 'empty-sel-net',
      views: [
        {
          ...view,
          selectedNodes: [],
          selectedEdges: [],
          nodeViews: {},
          edgeViews: {},
          values: [],
        },
      ],
    })

    await getNetworkViewsFromDb('empty-sel-net')

    // Nothing to preserve, so nothing is written — reading a network must not
    // mint a change record every other tab then hydrates.
    expect(await getViewSelectionFromDb('empty-sel-net')).toBeUndefined()
  })

  it('drops the selection row when the network views are deleted', async () => {
    await setupFreshDb()
    await putViewSelectionToDb('gone-net', {
      selectedNodes: ['n1'],
      selectedEdges: [],
    })

    await deleteNetworkViewsFromDb('gone-net')

    expect(await getViewSelectionFromDb('gone-net')).toBeUndefined()
  })

  it('writes no change record when only the selection changes', async () => {
    await setupFreshDb()
    const db = await getDb()
    const view = createNetworkView('quiet-net-nodeLink-1', 'green')
    const persistable = [{ ...view, selectedNodes: [], selectedEdges: [] }]

    await putNetworkViewsToDb('quiet-net', persistable)
    const before = (await (db as any)._changes.toArray()).filter(
      (c: any) => c.table === 'cyNetworkViews',
    ).length

    // Re-persisting the same views (what a selection-only change produces, now
    // that selection is stripped) must be a no-op at the change-log level.
    await putNetworkViewsToDb('quiet-net', persistable)
    const after = (await (db as any)._changes.toArray()).filter(
      (c: any) => c.table === 'cyNetworkViews',
    ).length

    expect(after).toBe(before)
  })
})
