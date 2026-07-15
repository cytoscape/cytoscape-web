import { beforeEach, describe, expect, it, vi } from 'vitest'

// src/app-api/core/visualStyleApi.test.ts
// Plain Jest tests for visualStyleApi core — no renderHook, no React context.
import { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
import { ApiErrorCode } from '../types/ApiResult'
import { visualStyleApi } from './visualStyleApi'

const VPN = VisualPropertyName

// ── Mock: VisualStyleStore ────────────────────────────────────────────────────

const mockSetDefault = vi.fn()
const mockSetBypass = vi.fn()
const mockDeleteBypass = vi.fn()
const mockCreatePassthroughMapping = vi.fn()
const mockRemoveMapping = vi.fn()
const mockSetMapping = vi.fn()
const mockSetContinuousMappingValues = vi.fn()

// Mutable visualStyles map for tests
const mockVisualStyles: Record<string, any> = {}

// Mimics VisualStyleStore.createContinuousMapping: installs a default
// continuous mapping so callers can read it back via visualStyles.
const mockCreateContinuousMapping = vi.fn((networkId: string, vpName: string) => {
  mockVisualStyles[networkId][vpName] = {
    ...mockVisualStyles[networkId][vpName],
    mapping: {
      attribute: 'score',
      type: 'continuous',
      min: { value: 0, vpValue: 'defaultMin' },
      max: { value: 100, vpValue: 'defaultMax' },
      controlPoints: [
        { value: 0, vpValue: 'defaultMin' },
        { value: 50, vpValue: 'defaultMid' },
        { value: 100, vpValue: 'defaultMax' },
      ],
      ltMinVpValue: 'defaultLtMin',
      gtMaxVpValue: 'defaultGtMax',
    },
  }
})

vi.mock('../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: vi.fn(() => ({
      visualStyles: mockVisualStyles,
      setDefault: mockSetDefault,
      setBypass: mockSetBypass,
      deleteBypass: mockDeleteBypass,
      setMapping: mockSetMapping,
      createContinuousMapping: mockCreateContinuousMapping,
      setContinuousMappingValues: mockSetContinuousMappingValues,
      createPassthroughMapping: mockCreatePassthroughMapping,
      removeMapping: mockRemoveMapping,
    })),
  },
}))

// ── Mock: NetworkStore (for bypass element-existence checks) ─────────────────

const mockNetworks = new Map<string, any>()

vi.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: {
    getState: vi.fn(() => ({
      networks: mockNetworks,
    })),
  },
}))

// ── Mock: TableStore (for mapping attribute checks) ──────────────────────────

const mockTables: Record<string, any> = {}

vi.mock('../../data/hooks/stores/TableStore', () => ({
  useTableStore: {
    getState: vi.fn(() => ({
      tables: mockTables,
    })),
  },
}))

/** Declare columns on net1's node/edge tables */
function declareColumns(nodeColumns: any[], edgeColumns: any[] = []): void {
  mockTables['net1'] = {
    nodeTable: { rows: new Map(), columns: nodeColumns },
    edgeTable: { rows: new Map(), columns: edgeColumns },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(mockVisualStyles).forEach((k) => delete mockVisualStyles[k])
  mockNetworks.clear()
  Object.keys(mockTables).forEach((k) => delete mockTables[k])
})

// --- setDefault --------------------------------------------------------------

describe('setDefault', () => {
  const setupDefaultFixtures = (): void => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: { type: 'color', group: 'node' },
      [VPN.NodeShape]: { type: 'nodeShape', group: 'node' },
      [VPN.NodeOpacity]: { type: 'number', group: 'node' },
      [VPN.NodeHeight]: { type: 'number', group: 'node' },
      [VPN.NodeLabel]: { type: 'string', group: 'node' },
    }
  }

  it('calls setDefault and returns ok() when network exists', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault('net1', VPN.NodeBackgroundColor, '#ff0000')

    expect(result.success).toBe(true)
    expect(mockSetDefault).toHaveBeenCalledWith('net1', VPN.NodeBackgroundColor, '#ff0000')
  })

  it('returns NetworkNotFound when visual style does not exist', () => {
    const result = visualStyleApi.setDefault('missing', VPN.NodeBackgroundColor, '#ff0000')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
    expect(mockSetDefault).not.toHaveBeenCalled()
  })

  it('returns OperationFailed when store throws', () => {
    setupDefaultFixtures()
    mockSetDefault.mockImplementationOnce(() => {
      throw new Error('store error')
    })

    const result = visualStyleApi.setDefault('net1', VPN.NodeBackgroundColor, '#ff0000')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.OperationFailed)
    }
  })

  it('rejects a malformed color value (CX2 VP2)', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault(
      'net1',
      VPN.NodeBackgroundColor,
      'not-a-color',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('VP2')
    }
    expect(mockSetDefault).not.toHaveBeenCalled()
  })

  it('rejects an unknown enum value for a shape property (CX2 VP5)', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault(
      'net1',
      VPN.NodeShape,
      'dodecahedron' as any,
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('VP5')
    }
  })

  it('rejects an out-of-range opacity (CX2 VP3)', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault('net1', VPN.NodeOpacity, 1.5)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('VP3')
    }
  })

  it('rejects a non-numeric value for a numeric property (CX2 VP4)', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault(
      'net1',
      VPN.NodeHeight,
      'tall' as any,
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('VP4')
    }
  })

  it('accepts valid values for each scalar type', () => {
    setupDefaultFixtures()

    expect(
      visualStyleApi.setDefault('net1', VPN.NodeBackgroundColor, '#0f0f0f')
        .success,
    ).toBe(true)
    expect(
      visualStyleApi.setDefault('net1', VPN.NodeShape, 'ellipse' as any)
        .success,
    ).toBe(true)
    expect(
      visualStyleApi.setDefault('net1', VPN.NodeOpacity, 0.5).success,
    ).toBe(true)
    expect(visualStyleApi.setDefault('net1', VPN.NodeHeight, 40).success).toBe(
      true,
    )
    expect(
      visualStyleApi.setDefault('net1', VPN.NodeLabel, 'hello').success,
    ).toBe(true)
  })

  it('rejects an unknown visual property name', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault(
      'net1',
      'notARealProperty' as any,
      '#ffffff',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
  })
})

// --- setBypass ---------------------------------------------------------------

describe('setBypass', () => {
  const setupBypassFixtures = (): void => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: { group: 'node' },
      [VPN.EdgeLineColor]: { group: 'edge' },
      [VPN.NetworkBackgroundColor]: { group: 'network' },
    }
    mockNetworks.set('net1', {
      id: 'net1',
      nodes: [{ id: 'n1' }, { id: 'n2' }],
      edges: [{ id: 'e0', s: 'n1', t: 'n2' }],
    })
  }

  it('calls setBypass and returns ok() when network and elements exist', () => {
    setupBypassFixtures()

    const result = visualStyleApi.setBypass(
      'net1',
      VPN.NodeBackgroundColor,
      ['n1', 'n2'],
      '#0000ff',
    )

    expect(result.success).toBe(true)
    expect(mockSetBypass).toHaveBeenCalledWith(
      'net1',
      VPN.NodeBackgroundColor,
      ['n1', 'n2'],
      '#0000ff',
    )
  })

  it('accepts edge IDs as bypass targets for edge properties', () => {
    setupBypassFixtures()

    const result = visualStyleApi.setBypass(
      'net1',
      VPN.EdgeLineColor,
      ['e0'],
      '#00ff00',
    )

    expect(result.success).toBe(true)
  })

  it('rejects bypass targets that do not exist in the network (CX2 BV1)', () => {
    setupBypassFixtures()

    const result = visualStyleApi.setBypass(
      'net1',
      VPN.NodeBackgroundColor,
      ['n1', 'ghost'],
      '#ff0000',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.ElementNotFound)
      expect(result.error.cx2Code).toBe('BV1')
      expect(result.error.message).toContain('ghost')
    }
    expect(mockSetBypass).not.toHaveBeenCalled()
  })

  it('rejects bypassing a network-scoped visual property (CX2 BV5)', () => {
    setupBypassFixtures()

    const result = visualStyleApi.setBypass(
      'net1',
      VPN.NetworkBackgroundColor,
      ['n1'],
      '#ffffff',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('BV5')
    }
    expect(mockSetBypass).not.toHaveBeenCalled()
  })

  it('rejects a node property bypass targeting an edge (CX2 BV2)', () => {
    setupBypassFixtures()

    const result = visualStyleApi.setBypass(
      'net1',
      VPN.NodeBackgroundColor,
      ['e0'],
      '#ff0000',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('BV2')
      expect(result.error.message).toContain('e0')
    }
    expect(mockSetBypass).not.toHaveBeenCalled()
  })

  it('rejects an edge property bypass targeting a node (CX2 BV2)', () => {
    setupBypassFixtures()

    const result = visualStyleApi.setBypass(
      'net1',
      VPN.EdgeLineColor,
      ['n1'],
      '#ff0000',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('BV2')
    }
  })

  it('rejects an unknown visual property name', () => {
    setupBypassFixtures()

    const result = visualStyleApi.setBypass(
      'net1',
      'notARealProperty' as any,
      ['n1'],
      '#ff0000',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
    expect(mockSetBypass).not.toHaveBeenCalled()
  })

  it('returns InvalidInput when elementIds is empty', () => {
    mockVisualStyles['net1'] = {}

    const result = visualStyleApi.setBypass('net1', VPN.NodeBackgroundColor, [], '#ff0000')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
    expect(mockSetBypass).not.toHaveBeenCalled()
  })

  it('returns NetworkNotFound when visual style does not exist', () => {
    const result = visualStyleApi.setBypass(
      'missing',
      VPN.NodeBackgroundColor,
      ['n1'],
      '#ff0000',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// --- deleteBypass ------------------------------------------------------------

describe('deleteBypass', () => {
  it('calls deleteBypass and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {}

    const result = visualStyleApi.deleteBypass('net1', VPN.NodeBackgroundColor, ['n1'])

    expect(result.success).toBe(true)
    expect(mockDeleteBypass).toHaveBeenCalledWith(
      'net1',
      VPN.NodeBackgroundColor,
      ['n1'],
    )
  })

  it('returns NetworkNotFound when visual style does not exist', () => {
    const result = visualStyleApi.deleteBypass('missing', VPN.NodeBackgroundColor, ['n1'])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// --- createDiscreteMapping ---------------------------------------------------

describe('createDiscreteMapping', () => {
  it('calls setMapping and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: { type: 'color', defaultValue: '#89D0F5', group: 'node' },
    }
    declareColumns([{ name: 'type', type: 'string' }])

    const result = visualStyleApi.createDiscreteMapping(
      'net1',
      VPN.NodeBackgroundColor,
      'type',
      'string',
    )

    expect(result.success).toBe(true)
    expect(mockSetMapping).toHaveBeenCalledWith(
      'net1',
      VPN.NodeBackgroundColor,
      expect.objectContaining({ attribute: 'type', type: 'discrete' }),
    )
  })

  it('returns NetworkNotFound when visual style does not exist', () => {
    const result = visualStyleApi.createDiscreteMapping(
      'missing',
      VPN.NodeBackgroundColor,
      'type',
      'string',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })

  it('builds a vpValueMap from string mapping entries when attributeType is string', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: { type: 'color', defaultValue: '#89D0F5', group: 'node' },
    }
    declareColumns([{ name: 'type', type: 'string' }])

    const result = visualStyleApi.createDiscreteMapping(
      'net1',
      VPN.NodeBackgroundColor,
      'type',
      'string',
      { protein: '#ff0000', rna: '#00ff00' },
    )

    expect(result.success).toBe(true)
    expect(mockSetMapping).toHaveBeenCalledWith(
      'net1',
      VPN.NodeBackgroundColor,
      expect.objectContaining({
        attribute: 'type',
        type: 'discrete',
        vpValueMap: new Map([
          ['protein', '#ff0000'],
          ['rna', '#00ff00'],
        ]),
      }),
    )
  })

  it('parses mapping keys as numbers when attributeType is integer or double', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    declareColumns([
      { name: 'degree', type: 'integer' },
      { name: 'score', type: 'double' },
    ])

    visualStyleApi.createDiscreteMapping(
      'net1',
      VPN.NodeHeight,
      'degree',
      'integer',
      { '1': 20, '2': 40 },
    )

    expect(mockSetMapping).toHaveBeenCalledWith(
      'net1',
      VPN.NodeHeight,
      expect.objectContaining({
        vpValueMap: new Map([
          [1, 20],
          [2, 40],
        ]),
      }),
    )

    visualStyleApi.createDiscreteMapping(
      'net1',
      VPN.NodeHeight,
      'score',
      'double',
      { '1.5': 20, '2.5': 40 },
    )

    expect(mockSetMapping).toHaveBeenCalledWith(
      'net1',
      VPN.NodeHeight,
      expect.objectContaining({
        vpValueMap: new Map([
          [1.5, 20],
          [2.5, 40],
        ]),
      }),
    )
  })

  it('rejects a mapping on an undeclared attribute (CX2 MI1)', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: { type: 'color', defaultValue: '#fff', group: 'node' },
    }
    declareColumns([{ name: 'type', type: 'string' }])

    const result = visualStyleApi.createDiscreteMapping(
      'net1',
      VPN.NodeBackgroundColor,
      'notAColumn',
      'string',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('MI1')
    }
    expect(mockSetMapping).not.toHaveBeenCalled()
  })

  it('rejects an attributeType that mismatches the declared column type (CX2 MI2)', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: { type: 'color', defaultValue: '#fff', group: 'node' },
    }
    declareColumns([{ name: 'type', type: 'string' }])

    const result = visualStyleApi.createDiscreteMapping(
      'net1',
      VPN.NodeBackgroundColor,
      'type',
      'integer',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('MI2')
    }
  })

  it('rejects a mapping on a network-scoped visual property (CX2 MC1)', () => {
    mockVisualStyles['net1'] = {
      [VPN.NetworkBackgroundColor]: { type: 'color', defaultValue: '#fff', group: 'network' },
    }
    declareColumns([{ name: 'type', type: 'string' }])

    const result = visualStyleApi.createDiscreteMapping(
      'net1',
      VPN.NetworkBackgroundColor,
      'type',
      'string',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('MC1')
    }
  })
})

// --- createContinuousMapping -------------------------------------------------

describe('createContinuousMapping', () => {
  it('calls createContinuousMapping and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    declareColumns([{ name: 'score', type: 'double' }])

    const result = visualStyleApi.createContinuousMapping(
      'net1',
      VPN.NodeHeight,
      'double',
      'score',
      [0, 50, 100],
      'double',
    )

    expect(result.success).toBe(true)
    expect(mockCreateContinuousMapping).toHaveBeenCalledWith(
      'net1',
      VPN.NodeHeight,
      'double',
      'score',
      [0, 50, 100],
      'double',
    )
  })

  it('returns NetworkNotFound when visual style does not exist', () => {
    const result = visualStyleApi.createContinuousMapping(
      'missing',
      VPN.NodeHeight,
      'double',
      'score',
      [],
      'double',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
    expect(mockSetContinuousMappingValues).not.toHaveBeenCalled()
  })

  it('falls back to the computed defaults when no overrides are given', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    declareColumns([{ name: 'score', type: 'double' }])

    visualStyleApi.createContinuousMapping(
      'net1',
      VPN.NodeHeight,
      'double',
      'score',
      [0, 50, 100],
      'double',
    )

    expect(mockSetContinuousMappingValues).toHaveBeenCalledWith(
      'net1',
      VPN.NodeHeight,
      { value: 0, vpValue: 'defaultMin' },
      { value: 100, vpValue: 'defaultMax' },
      [
        { value: 0, vpValue: 'defaultMin' },
        { value: 50, vpValue: 'defaultMid' },
        { value: 100, vpValue: 'defaultMax' },
      ],
      'defaultLtMin',
      'defaultGtMax',
    )
  })

  it('overrides controlPoints, deriving min/max from the first/last entries', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    declareColumns([{ name: 'score', type: 'double' }])

    const controlPoints = [
      { value: 10, vpValue: 20 },
      { value: 60, vpValue: 40 },
      { value: 90, vpValue: 60 },
    ]

    visualStyleApi.createContinuousMapping(
      'net1',
      VPN.NodeHeight,
      'double',
      'score',
      [0, 50, 100],
      'double',
      controlPoints,
    )

    expect(mockSetContinuousMappingValues).toHaveBeenCalledWith(
      'net1',
      VPN.NodeHeight,
      { value: 10, vpValue: 20 },
      { value: 90, vpValue: 60 },
      controlPoints,
      'defaultLtMin',
      'defaultGtMax',
    )
  })

  it('preserves an explicit inclusive flag on overridden control points', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: { type: 'color', defaultValue: '#ffffff', group: 'node' },
    }
    declareColumns([{ name: 'score', type: 'double' }])

    const controlPoints = [
      { value: 0, vpValue: '#000000', inclusive: true },
      { value: 100, vpValue: '#ff0000' },
    ]

    visualStyleApi.createContinuousMapping(
      'net1',
      VPN.NodeBackgroundColor,
      'color',
      'score',
      [0, 100],
      'double',
      controlPoints,
      '#ffffff',
      '#ff0000',
    )

    expect(mockSetContinuousMappingValues).toHaveBeenCalledWith(
      'net1',
      VPN.NodeBackgroundColor,
      { value: 0, vpValue: '#000000', inclusive: true },
      { value: 100, vpValue: '#ff0000' },
      controlPoints,
      '#ffffff',
      '#ff0000',
    )
  })

  it('overrides ltMinVpValue and gtMaxVpValue while keeping computed control points', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    declareColumns([{ name: 'score', type: 'double' }])

    visualStyleApi.createContinuousMapping(
      'net1',
      VPN.NodeHeight,
      'double',
      'score',
      [0, 50, 100],
      'double',
      undefined,
      'customLtMin',
      'customGtMax',
    )

    expect(mockSetContinuousMappingValues).toHaveBeenCalledWith(
      'net1',
      VPN.NodeHeight,
      { value: 0, vpValue: 'defaultMin' },
      { value: 100, vpValue: 'defaultMax' },
      [
        { value: 0, vpValue: 'defaultMin' },
        { value: 50, vpValue: 'defaultMid' },
        { value: 100, vpValue: 'defaultMax' },
      ],
      'customLtMin',
      'customGtMax',
    )
  })

  it('rejects non-numeric attributeValues (CX2 V7)', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    declareColumns([{ name: 'score', type: 'double' }])

    const result = visualStyleApi.createContinuousMapping(
      'net1',
      VPN.NodeHeight,
      'double',
      'score',
      ['low', 'high'] as any,
      'double',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('V7')
    }
    expect(mockCreateContinuousMapping).not.toHaveBeenCalled()
  })

  it('rejects NaN and Infinity attributeValues (CX2 V7)', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    declareColumns([{ name: 'score', type: 'double' }])

    const result = visualStyleApi.createContinuousMapping(
      'net1',
      VPN.NodeHeight,
      'double',
      'score',
      [0, NaN, Infinity],
      'double',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('V7')
    }
  })

  it('rejects empty attributeValues (CX2 V7)', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    declareColumns([{ name: 'score', type: 'double' }])

    const result = visualStyleApi.createContinuousMapping(
      'net1',
      VPN.NodeHeight,
      'double',
      'score',
      [],
      'double',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('V7')
    }
  })

  it('rejects control points with non-numeric values (CX2 V7)', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    declareColumns([{ name: 'score', type: 'double' }])

    const result = visualStyleApi.createContinuousMapping(
      'net1',
      VPN.NodeHeight,
      'double',
      'score',
      [0, 100],
      'double',
      [
        { value: 'zero' as any, vpValue: 20 },
        { value: 100, vpValue: 60 },
      ],
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('V7')
    }
    expect(mockCreateContinuousMapping).not.toHaveBeenCalled()
  })

  it('rejects a continuous mapping on a non-numeric attribute (CX2 MI3)', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    declareColumns([{ name: 'label', type: 'string' }])

    const result = visualStyleApi.createContinuousMapping(
      'net1',
      VPN.NodeHeight,
      'double',
      'label',
      ['a', 'b'],
      'string',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('MI3')
    }
    expect(mockCreateContinuousMapping).not.toHaveBeenCalled()
  })
})

// --- createPassthroughMapping ------------------------------------------------

describe('createPassthroughMapping', () => {
  it('calls createPassthroughMapping and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeLabel]: { type: 'string', defaultValue: '', group: 'node' },
    }
    declareColumns([{ name: 'name', type: 'string' }])

    const result = visualStyleApi.createPassthroughMapping(
      'net1',
      VPN.NodeLabel,
      'name',
      'string',
    )

    expect(result.success).toBe(true)
    expect(mockCreatePassthroughMapping).toHaveBeenCalledWith(
      'net1',
      VPN.NodeLabel,
      'name',
      'string',
    )
  })

  it('returns NetworkNotFound when visual style does not exist', () => {
    const result = visualStyleApi.createPassthroughMapping(
      'missing',
      VPN.NodeLabel,
      'name',
      'string',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })

  it('rejects a passthrough mapping on an undeclared attribute (CX2 MI1)', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeLabel]: { type: 'string', defaultValue: '', group: 'node' },
    }
    declareColumns([{ name: 'name', type: 'string' }])

    const result = visualStyleApi.createPassthroughMapping(
      'net1',
      VPN.NodeLabel,
      'missingCol',
      'string',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('MI1')
    }
    expect(mockCreatePassthroughMapping).not.toHaveBeenCalled()
  })
})

// --- removeMapping -----------------------------------------------------------

describe('removeMapping', () => {
  it('calls removeMapping and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {}

    const result = visualStyleApi.removeMapping('net1', VPN.NodeBackgroundColor)

    expect(result.success).toBe(true)
    expect(mockRemoveMapping).toHaveBeenCalledWith('net1', VPN.NodeBackgroundColor)
  })

  it('returns NetworkNotFound when visual style does not exist', () => {
    const result = visualStyleApi.removeMapping('missing', VPN.NodeBackgroundColor)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})
