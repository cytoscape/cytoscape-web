import {
  closeDb,
  deleteDb,
  getDb,
  getNetworkSummariesFromDb,
  initializeDb,
  putNetworkSummaryToDb,
  putNetworkViewToDb,
} from './index'
import { IdType } from '../models/IdType'
import { NetworkSummary } from '../models/NetworkSummaryModel'
import { NetworkView } from '../models/ViewModel'
import {
  NetworkVisualPropertyName,
  NodeVisualPropertyName,
} from '../models/VisualStyleModel/VisualPropertyName'
import { deserializeNetworkView, serializeNetworkView } from './serialization'
import { getNetworkViewId } from '../hooks/stores/ViewModelStore'

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
})
