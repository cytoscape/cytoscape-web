import { describe, expect, it } from 'vitest'

import { Panel } from '../../models/UiModel/Panel'
import { PanelState } from '../../models/UiModel/PanelState'
import {
  validateCyApp,
  validateFilterConfig,
  validateNetwork,
  validateNetworkList,
  validateNetworkSummary,
  validateOpaqueAspects,
  validateOpaqueAspectsDb,
  validateNetworkView,
  validateSerializedFilterConfig,
  validateSerializedNetworkView,
  validateSerializedTable,
  validateServiceApp,
  validateServiceAppArray,
  validateStoredUiState,
  validateTable,
  validateTimestampEntry,
  validateUiState,
  validateUndoRedoStack,
  validateUndoRedoStackDb,
  validateVisualStyle,
  validateWorkspace,
  validateWorkspaceArray,
} from './validator'

// ---------------------------------------------------------------------------
// Contract tests for the IndexedDB read-path validators (src/data/db/validator.ts).
//
// These pure zod-backed guards are the intended integrity net for data coming
// *back out of* IndexedDB (a persisted store can be corrupted, tampered with, or
// left over from an older schema version). At the time of writing they are not
// yet wired into the getXxxFromDb read path, so this suite locks their contract
// so they can be connected safely. Each domain asserts both directions:
//   - a well-formed model round-trips (parse returns the value)
//   - a malformed payload is rejected (parse throws a ZodError)
// ---------------------------------------------------------------------------

const validWorkspace = () => ({
  id: 'ws-1',
  name: 'Workspace 1',
  currentNetworkId: 'net-1',
  networkIds: ['net-1'],
  localModificationTime: new Date(),
  creationTime: new Date(),
  networkModified: { 'net-1': false },
})

const validNetwork = () => ({
  id: 'net-1',
  nodes: [{ id: 'n1' }, { id: 'n2' }],
  edges: [{ id: 'e1', s: 'n1', t: 'n2' }],
})

const validSerializedTable = () => ({
  id: 'net-1',
  columns: [{ name: 'name', type: 'string' }],
  rows: [
    ['n1', { name: 'Node 1' }],
    ['n2', { name: 'Node 2' }],
  ],
})

const validNetworkSummary = () => ({
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
  name: 'Network 1',
  properties: [],
  owner: 'owner',
  version: '1.0',
  completed: true,
  visibility: 'PUBLIC',
  nodeCount: 10,
  edgeCount: 20,
  description: 'Test network',
  creationTime: new Date(),
  externalId: 'net-1',
  isDeleted: false,
  modificationTime: new Date(),
})

const validServiceApp = () => ({
  url: 'https://example.org/service',
  name: 'Test Service',
  version: '1.0.0',
  cyWebAction: [],
  cyWebMenuItem: {
    root: 'Apps',
    path: [{ name: 'Tools', gravity: 1 }],
  },
  author: 'Author',
  citation: 'Citation',
  parameters: [],
})

const validCyApp = () => ({
  id: 'app-1',
  name: 'App 1',
  description: 'Test application',
  components: [{ id: 'app-1-component', type: 'Menu' }],
  status: 'Active',
})

const validFilterConfig = () => ({
  name: 'status-filter',
  target: 'node',
  attributeName: 'status',
  label: 'Status',
  description: 'Node status filter',
  widgetType: 'checkbox',
  displayMode: 'SELECT',
  range: { values: ['active', 'inactive'] },
})

const validUndoRedoStack = () => ({
  undoStack: [
    {
      undoCommand: 'SET_NETWORK_SUMMARY',
      description: 'Sample undo',
      undoParams: [],
      redoParams: [],
    },
  ],
  redoStack: [],
})

const validStoredUiState = () => ({
  id: 'uistate',
  panels: {
    [Panel.LEFT]: PanelState.OPEN,
    [Panel.RIGHT]: PanelState.CLOSED,
    [Panel.BOTTOM]: PanelState.MINIMIZED,
  },
  activeNetworkView: 'net-1',
  enablePopup: false,
  showErrorDialog: false,
  errorMessage: '',
  tableUi: { columnUiState: {}, activeTabIndex: 0 },
  networkBrowserPanelUi: { activeTabIndex: 0 },
  visualStyleOptions: {},
  networkViewUi: { activeTabIndex: 0 },
})

// REVIEW.md round-1 P0 follow-up: these schemas were stricter than live
// data — an empty currentNetworkId (workspace with no networks) and an
// empty activeNetworkView (no sub-network view active) are legitimate
// persisted states and must validate, or wiring the validators would
// flag every fresh workspace.
describe('over-strict schema reconciliation (round 7)', () => {
  it('accepts an empty currentNetworkId (empty-workspace state)', () => {
    expect(() =>
      validateWorkspace({ ...validWorkspace(), currentNetworkId: '' }),
    ).not.toThrow()
  })

  it('accepts an empty activeNetworkView (no active sub-network view)', () => {
    expect(() =>
      validateStoredUiState({ ...validStoredUiState(), activeNetworkView: '' }),
    ).not.toThrow()
  })
})

describe('db validator - Workspace', () => {
  it('accepts a well-formed workspace', () => {
    const ws = validWorkspace()
    expect(validateWorkspace(ws)).toMatchObject({ id: 'ws-1' })
  })

  it('rejects a workspace missing its id', () => {
    const ws = validWorkspace() as Record<string, unknown>
    delete ws.id
    expect(() => validateWorkspace(ws)).toThrow()
  })

  it('rejects a workspace with an empty id (IdType must be non-empty)', () => {
    expect(() => validateWorkspace({ ...validWorkspace(), id: '' })).toThrow()
  })

  it('rejects a workspace whose networkIds is not an array', () => {
    expect(() =>
      validateWorkspace({ ...validWorkspace(), networkIds: 'net-1' }),
    ).toThrow()
  })

  it('validateWorkspaceArray accepts an array and rejects a bare object', () => {
    expect(validateWorkspaceArray([validWorkspace()])).toHaveLength(1)
    expect(() => validateWorkspaceArray(validWorkspace())).toThrow()
  })
})

describe('db validator - Network', () => {
  it('accepts a well-formed network topology', () => {
    expect(validateNetwork(validNetwork())).toMatchObject({ id: 'net-1' })
  })

  it('rejects an edge that is missing its source endpoint', () => {
    const net = validNetwork()
    net.edges = [{ id: 'e1', t: 'n2' } as any]
    expect(() => validateNetwork(net)).toThrow()
  })

  it('rejects a node with a non-string id', () => {
    const net = validNetwork()
    net.nodes = [{ id: 123 } as any]
    expect(() => validateNetwork(net)).toThrow()
  })

  it('validateNetworkList accepts an array and rejects a non-array', () => {
    expect(validateNetworkList([validNetwork()])).toHaveLength(1)
    expect(() => validateNetworkList(validNetwork())).toThrow()
  })
})

describe('db validator - Table', () => {
  it('accepts a serialized table (rows as entry tuples)', () => {
    const table = validateSerializedTable(validSerializedTable())
    expect(table.rows).toHaveLength(2)
  })

  it('rejects a serialized table whose rows are not [id, record] tuples', () => {
    expect(() =>
      validateSerializedTable({
        ...validSerializedTable(),
        rows: [['n1', 'not-a-record']],
      }),
    ).toThrow()
  })

  it('accepts an in-memory table whose rows are a Map', () => {
    const table = validateTable({
      id: 'net-1',
      columns: [{ name: 'name', type: 'string' }],
      rows: new Map([['n1', { name: 'Node 1' }]]),
    })
    expect(table.id).toBe('net-1')
  })

  it('rejects an in-memory table whose rows are a plain object (not a Map)', () => {
    expect(() =>
      validateTable({
        id: 'net-1',
        columns: [{ name: 'name', type: 'string' }],
        rows: { n1: { name: 'Node 1' } },
      }),
    ).toThrow()
  })

  it('rejects an in-memory table whose row value is not an attribute record', () => {
    expect(() =>
      validateTable({
        id: 'net-1',
        columns: [{ name: 'name', type: 'string' }],
        rows: new Map<string, unknown>([['n1', 'not-a-record']]),
      }),
    ).toThrow()
  })

  it('rejects an in-memory table whose row key is not a string', () => {
    expect(() =>
      validateTable({
        id: 'net-1',
        columns: [{ name: 'name', type: 'string' }],
        rows: new Map<unknown, unknown>([[1, { name: 'Node 1' }]]),
      }),
    ).toThrow()
  })
})

describe('db validator - NetworkSummary', () => {
  it('accepts a well-formed summary', () => {
    expect(validateNetworkSummary(validNetworkSummary())).toMatchObject({
      externalId: 'net-1',
    })
  })

  it('coerces ISO-string timestamps into Date instances', () => {
    const summary = {
      ...validNetworkSummary(),
      creationTime: '2026-01-01T00:00:00.000Z',
      modificationTime: '2026-01-02T00:00:00.000Z',
    }
    const parsed = validateNetworkSummary(summary)
    expect(parsed.creationTime).toBeInstanceOf(Date)
    expect(parsed.modificationTime).toBeInstanceOf(Date)
  })

  it('rejects a summary whose nodeCount is not a number', () => {
    expect(() =>
      validateNetworkSummary({ ...validNetworkSummary(), nodeCount: 'ten' }),
    ).toThrow()
  })
})

describe('db validator - ServiceApp & CyApp', () => {
  it('accepts a well-formed service app', () => {
    expect(validateServiceApp(validServiceApp())).toMatchObject({
      url: 'https://example.org/service',
    })
  })

  it('rejects a service app missing its menu item', () => {
    const app = validServiceApp() as Record<string, unknown>
    delete app.cyWebMenuItem
    expect(() => validateServiceApp(app)).toThrow()
  })

  it('validateServiceAppArray accepts an array and rejects a bare object', () => {
    expect(validateServiceAppArray([validServiceApp()])).toHaveLength(1)
    expect(() => validateServiceAppArray(validServiceApp())).toThrow()
  })

  it('accepts a well-formed CyApp', () => {
    expect(validateCyApp(validCyApp())).toMatchObject({ id: 'app-1' })
  })

  it('rejects a CyApp whose components are not an array', () => {
    expect(() =>
      validateCyApp({ ...validCyApp(), components: 'menu' }),
    ).toThrow()
  })
})

describe('db validator - FilterConfig', () => {
  it('accepts a discrete-range filter config', () => {
    expect(validateFilterConfig(validFilterConfig())).toMatchObject({
      name: 'status-filter',
    })
  })

  it('accepts a numeric-range filter config', () => {
    const config = { ...validFilterConfig(), range: { min: 0, max: 100 } }
    expect(validateFilterConfig(config)).toMatchObject({ name: 'status-filter' })
  })

  it('rejects a filter config with an invalid range shape', () => {
    expect(() =>
      validateFilterConfig({ ...validFilterConfig(), range: { foo: 'bar' } }),
    ).toThrow()
  })
})

describe('db validator - OpaqueAspects', () => {
  it('accepts a well-formed OpaqueAspectsDB record', () => {
    const parsed = validateOpaqueAspectsDb({
      id: 'net-1',
      aspects: { myAspect: [{ n: 'n1', value: 1 }] },
    })
    expect(parsed.id).toBe('net-1')
  })

  it('rejects an OpaqueAspectsDB whose aspect values are not arrays', () => {
    expect(() =>
      validateOpaqueAspectsDb({ id: 'net-1', aspects: { myAspect: 'nope' } }),
    ).toThrow()
  })

  it('accepts a bare OpaqueAspects record', () => {
    expect(validateOpaqueAspects({ myAspect: [{ n: 'n1' }] })).toMatchObject({
      myAspect: expect.any(Array),
    })
  })
})

describe('db validator - UndoRedoStack', () => {
  it('accepts a well-formed undo/redo stack', () => {
    expect(validateUndoRedoStack(validUndoRedoStack())).toMatchObject({
      redoStack: [],
    })
  })

  it('accepts a persisted UndoRedoStackDB envelope', () => {
    const parsed = validateUndoRedoStackDb({
      id: 'net-1',
      undoRedoStack: validUndoRedoStack(),
    })
    expect(parsed.id).toBe('net-1')
  })

  it('rejects an edit that is missing its command', () => {
    expect(() =>
      validateUndoRedoStack({
        undoStack: [{ description: 'x', undoParams: [], redoParams: [] }],
        redoStack: [],
      }),
    ).toThrow()
  })
})

describe('db validator - Timestamp & UiState', () => {
  it('accepts a timestamp entry and rejects a non-numeric timestamp', () => {
    expect(validateTimestampEntry({ id: 'timestamp', timestamp: 123 })).toEqual(
      { id: 'timestamp', timestamp: 123 },
    )
    expect(() =>
      validateTimestampEntry({ id: 'timestamp', timestamp: 'now' }),
    ).toThrow()
  })

  it('accepts a well-formed stored UI state', () => {
    expect(validateStoredUiState(validStoredUiState())).toMatchObject({
      id: 'uistate',
    })
  })

  it('rejects an empty object as stored UI state', () => {
    expect(() => validateStoredUiState({})).toThrow()
  })

  it('accepts an in-memory UI state without the stored id', () => {
    const ui = validStoredUiState() as Record<string, unknown>
    delete ui.id
    expect(validateUiState(ui)).toMatchObject({ activeNetworkView: 'net-1' })
  })
})

describe('db validator - views, style & serialized filter', () => {
  it('accepts an in-memory network view (Map-based values)', () => {
    const view = {
      id: 'net-1',
      nodeViews: {
        n1: { id: 'n1', x: 0, y: 0, values: new Map([['color', '#fff']]) },
      },
      edgeViews: {},
      selectedNodes: [],
      selectedEdges: [],
      values: new Map(),
    }
    expect(validateNetworkView(view)).toMatchObject({ id: 'net-1' })
  })

  it('accepts a serialized network view (entry-tuple values)', () => {
    const view = {
      id: 'net-1',
      nodeViews: {
        n1: { id: 'n1', x: 0, y: 0, values: [['color', '#fff']] },
      },
      edgeViews: {},
      selectedNodes: [],
      selectedEdges: [],
      values: [],
    }
    expect(validateSerializedNetworkView(view)).toMatchObject({ id: 'net-1' })
  })

  it('accepts a visual style record', () => {
    const style = {
      nodeBackgroundColor: {
        name: 'nodeBackgroundColor',
        group: 'node',
        displayName: 'Node Background Color',
        type: 'color',
        defaultValue: '#ffffff',
        bypassMap: new Map(),
      },
    }
    expect(validateVisualStyle(style)).toMatchObject({
      nodeBackgroundColor: expect.any(Object),
    })
  })

  it('accepts a serialized filter config', () => {
    expect(validateSerializedFilterConfig(validFilterConfig())).toMatchObject({
      name: 'status-filter',
    })
  })
})
