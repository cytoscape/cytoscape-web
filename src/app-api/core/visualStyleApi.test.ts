// src/app-api/core/visualStyleApi.test.ts
// Plain Jest tests for visualStyleApi core — no renderHook, no React context.

import { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
import { ApiErrorCode } from '../types/ApiResult'
import { visualStyleApi } from './visualStyleApi'

const VPN = VisualPropertyName

// ── Mock: VisualStyleStore ────────────────────────────────────────────────────

const mockSetDefault = jest.fn()
const mockSetBypass = jest.fn()
const mockDeleteBypass = jest.fn()
const mockCreateDiscreteMapping = jest.fn()
const mockCreateContinuousMapping = jest.fn()
const mockCreatePassthroughMapping = jest.fn()
const mockRemoveMapping = jest.fn()

// Mutable visualStyles map for tests
const mockVisualStyles: Record<string, any> = {}

jest.mock('../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: jest.fn(() => ({
      visualStyles: mockVisualStyles,
      setDefault: mockSetDefault,
      setBypass: mockSetBypass,
      deleteBypass: mockDeleteBypass,
      createDiscreteMapping: mockCreateDiscreteMapping,
      createContinuousMapping: mockCreateContinuousMapping,
      createPassthroughMapping: mockCreatePassthroughMapping,
      removeMapping: mockRemoveMapping,
    })),
  },
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
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
  it('calls createDiscreteMapping and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {}

    const result = visualStyleApi.createDiscreteMapping(
      'net1',
      VPN.NodeBackgroundColor,
      'type',
      'string',
    )

    expect(result.success).toBe(true)
    expect(mockCreateDiscreteMapping).toHaveBeenCalledWith(
      'net1',
      VPN.NodeBackgroundColor,
      'type',
      'string',
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
})

// --- createContinuousMapping -------------------------------------------------

describe('createContinuousMapping', () => {
  it('calls createContinuousMapping and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {}

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
  })
})

// --- createPassthroughMapping ------------------------------------------------

describe('createPassthroughMapping', () => {
  it('calls createPassthroughMapping and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {}

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
