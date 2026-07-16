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

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(mockVisualStyles).forEach((k) => delete mockVisualStyles[k])
})

// --- setDefault --------------------------------------------------------------

describe('setDefault', () => {
  it('calls setDefault and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {}

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
    mockVisualStyles['net1'] = {}
    mockSetDefault.mockImplementation(() => {
      throw new Error('store error')
    })

    const result = visualStyleApi.setDefault('net1', VPN.NodeBackgroundColor, '#ff0000')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.OperationFailed)
    }
  })
})

// --- setBypass ---------------------------------------------------------------

describe('setBypass', () => {
  it('calls setBypass and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {}

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
      [VPN.NodeBackgroundColor]: { type: 'color', defaultValue: '#89D0F5' },
    }

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
      [VPN.NodeBackgroundColor]: { type: 'color', defaultValue: '#89D0F5' },
    }

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
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10 },
    }

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
})

// --- createContinuousMapping -------------------------------------------------

describe('createContinuousMapping', () => {
  it('calls createContinuousMapping and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = { [VPN.NodeHeight]: { type: 'number', defaultValue: 10 } }

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
    mockVisualStyles['net1'] = { [VPN.NodeHeight]: { type: 'number', defaultValue: 10 } }

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
    mockVisualStyles['net1'] = { [VPN.NodeHeight]: { type: 'number', defaultValue: 10 } }

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
    mockVisualStyles['net1'] = { [VPN.NodeBackgroundColor]: { type: 'color', defaultValue: '#ffffff' } }

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
    mockVisualStyles['net1'] = { [VPN.NodeHeight]: { type: 'number', defaultValue: 10 } }

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
})

// --- createPassthroughMapping ------------------------------------------------

describe('createPassthroughMapping', () => {
  it('calls createPassthroughMapping and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = { [VPN.NodeLabel]: { type: 'string', defaultValue: '' } }

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
