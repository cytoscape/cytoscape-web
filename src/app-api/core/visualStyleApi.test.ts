import { beforeEach, describe, expect, it, vi } from 'vitest'

// src/app-api/core/visualStyleApi.test.ts
// Plain Jest tests for visualStyleApi core — no renderHook, no React context.
import { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
import { AppCodes, StyleCodes } from '../types/ApiResult'
import { visualStyleApi } from './visualStyleApi'

const VPN = VisualPropertyName

// ── Mock: WorkspaceStore (markNetworkModified) ───────────────────────────────

const mockSetNetworkModified = vi.fn()

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
      workspace: { currentNetworkId: 'net1', networkModified: {} },
      setNetworkModified: mockSetNetworkModified,
    })),
  },
}))

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
const mockCreateContinuousMapping = vi.fn(
  (networkId: string, vpName: string) => {
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
  },
)

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

// --- Read API ----------------------------------------------------------------

describe('read API', () => {
  const setupReadFixtures = (): void => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: {
        group: 'node',
        type: 'color',
        defaultValue: '#ffffff',
        bypassMap: new Map([
          ['n1', '#ff0000'],
          ['n2', '#00ff00'],
        ]),
      },
      [VPN.NodeLabel]: {
        group: 'node',
        type: 'string',
        defaultValue: '',
        bypassMap: new Map(),
        mapping: { type: 'passthrough', attribute: 'name' },
      },
    }
  }

  describe('getVisualProperties', () => {
    it('lists properties with group, type, and hasMapping', () => {
      setupReadFixtures()
      const result = visualStyleApi.getVisualProperties('net1')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.properties).toContainEqual({
          name: VPN.NodeBackgroundColor,
          group: 'node',
          type: 'color',
          hasMapping: false,
        })
        expect(result.data.properties).toContainEqual({
          name: VPN.NodeLabel,
          group: 'node',
          type: 'string',
          hasMapping: true,
        })
      }
    })

    it('returns NetworkNotFound when the style does not exist', () => {
      const result = visualStyleApi.getVisualProperties('missing')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })
  })

  describe('getDefault', () => {
    it('returns the default value', () => {
      setupReadFixtures()
      const result = visualStyleApi.getDefault('net1', VPN.NodeBackgroundColor)
      expect(result.success && result.data.value).toBe('#ffffff')
    })

    it('returns InvalidInput for an unknown property', () => {
      setupReadFixtures()
      const result = visualStyleApi.getDefault('net1', 'NOT_A_VP' as any)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
      }
    })
  })

  describe('getBypass / getBypasses', () => {
    it('reads a single element bypass', () => {
      setupReadFixtures()
      const result = visualStyleApi.getBypass(
        'net1',
        VPN.NodeBackgroundColor,
        'n1',
      )
      expect(result.success && result.data.value).toBe('#ff0000')
    })

    it('returns undefined for an element with no bypass', () => {
      setupReadFixtures()
      const result = visualStyleApi.getBypass(
        'net1',
        VPN.NodeBackgroundColor,
        'n99',
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.value).toBeUndefined()
      }
    })

    it('reads all bypasses keyed by element id', () => {
      setupReadFixtures()
      const result = visualStyleApi.getBypasses('net1', VPN.NodeBackgroundColor)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.bypasses).toEqual({
          n1: '#ff0000',
          n2: '#00ff00',
        })
      }
    })
  })

  describe('getMapping', () => {
    it('returns the installed mapping', () => {
      setupReadFixtures()
      const result = visualStyleApi.getMapping('net1', VPN.NodeLabel)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mapping).toEqual({
          type: 'passthrough',
          attribute: 'name',
        })
      }
    })

    it('returns undefined when the property has no mapping', () => {
      setupReadFixtures()
      const result = visualStyleApi.getMapping('net1', VPN.NodeBackgroundColor)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mapping).toBeUndefined()
      }
    })
  })
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
      [VPN.NodeLabelPosition]: { type: 'nodeLabelPosition', group: 'node' },
      nodeCustomGraphic: { type: 'customGraphic', group: 'node' },
      nodeCustomGraphicPos: { type: 'customGraphicPosition', group: 'node' },
    }
  }

  const validLabelPosition = {
    HORIZONTAL_ALIGN: 'center',
    VERTICAL_ALIGN: 'top',
    HORIZONTAL_ANCHOR: 'left',
    VERTICAL_ANCHOR: 'bottom',
    MARGIN_X: 0,
    MARGIN_Y: 2.5,
    JUSTIFICATION: 'center',
  }

  it('calls setDefault and returns ok() when network exists', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault(
      'net1',
      VPN.NodeBackgroundColor,
      '#ff0000',
    )

    expect(result.success).toBe(true)
    expect(mockSetDefault).toHaveBeenCalledWith(
      'net1',
      VPN.NodeBackgroundColor,
      '#ff0000',
    )
  })

  it('returns NetworkNotFound when visual style does not exist', () => {
    const result = visualStyleApi.setDefault(
      'missing',
      VPN.NodeBackgroundColor,
      '#ff0000',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
    expect(mockSetDefault).not.toHaveBeenCalled()
  })

  it('returns OperationFailed when store throws', () => {
    setupDefaultFixtures()
    mockSetDefault.mockImplementationOnce(() => {
      throw new Error('store error')
    })

    const result = visualStyleApi.setDefault(
      'net1',
      VPN.NodeBackgroundColor,
      '#ff0000',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.OPERATION_FAILED.code)
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
      expect(result.error.code).toBe(StyleCodes.INVALID_COLOR.code)
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
      expect(result.error.code).toBe(StyleCodes.INVALID_ENUM_VALUE.code)
    }
  })

  it('rejects an out-of-range opacity (CX2 VP3)', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault('net1', VPN.NodeOpacity, 1.5)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(StyleCodes.INVALID_OPACITY.code)
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
      expect(result.error.code).toBe(StyleCodes.INVALID_NUMBER.code)
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
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
  })

  it('accepts a complete, valid label position object', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault(
      'net1',
      VPN.NodeLabelPosition,
      validLabelPosition as any,
    )

    expect(result.success).toBe(true)
  })

  it('rejects a label position missing a mandatory key (CX2 VP7)', () => {
    setupDefaultFixtures()
    const { HORIZONTAL_ALIGN, ...partial } = validLabelPosition
    void HORIZONTAL_ALIGN

    const result = visualStyleApi.setDefault(
      'net1',
      VPN.NodeLabelPosition,
      partial as any,
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(StyleCodes.INVALID_LABEL_POSITION.code)
      expect(result.error.message).toContain('HORIZONTAL_ALIGN')
    }
    expect(mockSetDefault).not.toHaveBeenCalled()
  })

  it('rejects a label position with a non-numeric margin (CX2 VP7)', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault('net1', VPN.NodeLabelPosition, {
      ...validLabelPosition,
      MARGIN_X: 'far',
    } as any)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(StyleCodes.INVALID_LABEL_POSITION.code)
    }
  })

  it('rejects a custom graphics object with an unknown type (CX2 VP9)', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault(
      'net1',
      'nodeCustomGraphic' as any,
      { type: 'hologram', name: 'none', properties: {} } as any,
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(StyleCodes.INVALID_CUSTOM_GRAPHICS.code)
    }
  })

  it('accepts a valid custom graphics object', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault(
      'net1',
      'nodeCustomGraphic' as any,
      { type: 'none', name: 'none', properties: {} } as any,
    )

    expect(result.success).toBe(true)
  })

  it('rejects a custom graphics position with a bad anchor (CX2 VP10)', () => {
    setupDefaultFixtures()

    const result = visualStyleApi.setDefault(
      'net1',
      'nodeCustomGraphicPos' as any,
      {
        JUSTIFICATION: 'center',
        MARGIN_X: 0,
        MARGIN_Y: 0,
        ENTITY_ANCHOR: 'Q',
        GRAPHICS_ANCHOR: 'C',
      } as any,
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(
        StyleCodes.INVALID_CUSTOM_GRAPHICS_POSITION.code,
      )
    }
  })
})

// --- setDefaults (batch) -----------------------------------------------------

describe('setDefaults', () => {
  const setup = (): void => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: { type: 'color', group: 'node' },
      [VPN.NodeHeight]: { type: 'number', group: 'node' },
    }
  }

  it('applies every default when all are valid', () => {
    setup()
    const result = visualStyleApi.setDefaults('net1', {
      [VPN.NodeBackgroundColor]: '#ff0000',
      [VPN.NodeHeight]: 42,
    })
    expect(result.success).toBe(true)
    expect(mockSetDefault).toHaveBeenCalledWith(
      'net1',
      VPN.NodeBackgroundColor,
      '#ff0000',
    )
    expect(mockSetDefault).toHaveBeenCalledWith('net1', VPN.NodeHeight, 42)
    expect(mockSetDefault).toHaveBeenCalledTimes(2)
  })

  it('returns NetworkNotFound when the style does not exist', () => {
    const result = visualStyleApi.setDefaults('missing', {
      [VPN.NodeHeight]: 1,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it('applies nothing when any entry is invalid (all-or-nothing)', () => {
    setup()
    const result = visualStyleApi.setDefaults('net1', {
      [VPN.NodeBackgroundColor]: '#ff0000',
      [VPN.NodeHeight]: 'not-a-number' as any,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(StyleCodes.INVALID_NUMBER.code)
    }
    expect(mockSetDefault).not.toHaveBeenCalled()
  })

  it('rejects an unknown visual property without applying anything', () => {
    setup()
    const result = visualStyleApi.setDefaults('net1', {
      NOT_A_VP: 'x',
    } as any)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
    expect(mockSetDefault).not.toHaveBeenCalled()
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
      expect(result.error.code).toBe(StyleCodes.BYPASS_TARGET_NOT_FOUND.code)
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
      expect(result.error.code).toBe(
        StyleCodes.NETWORK_SCOPED_BYPASS_FORBIDDEN.code,
      )
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
      expect(result.error.code).toBe(StyleCodes.BYPASS_SCOPE_MISMATCH.code)
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
      expect(result.error.code).toBe(StyleCodes.BYPASS_SCOPE_MISMATCH.code)
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
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
    expect(mockSetBypass).not.toHaveBeenCalled()
  })

  it('returns InvalidInput when elementIds is empty', () => {
    mockVisualStyles['net1'] = {}

    const result = visualStyleApi.setBypass(
      'net1',
      VPN.NodeBackgroundColor,
      [],
      '#ff0000',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
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
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })
})

// --- setBypasses (batch) -----------------------------------------------------

describe('setBypasses', () => {
  const setup = (): void => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: { group: 'node', type: 'color' },
      [VPN.NodeHeight]: { group: 'node', type: 'number' },
      [VPN.EdgeLineColor]: { group: 'edge', type: 'color' },
    }
    mockNetworks.set('net1', {
      id: 'net1',
      nodes: [{ id: 'n1' }, { id: 'n2' }],
      edges: [{ id: 'e0', s: 'n1', t: 'n2' }],
    })
  }

  it('applies every bypass to the elements when all are valid', () => {
    setup()
    const result = visualStyleApi.setBypasses('net1', ['n1', 'n2'], {
      [VPN.NodeBackgroundColor]: '#ff0000',
      [VPN.NodeHeight]: 40,
    })
    expect(result.success).toBe(true)
    expect(mockSetBypass).toHaveBeenCalledWith(
      'net1',
      VPN.NodeBackgroundColor,
      ['n1', 'n2'],
      '#ff0000',
    )
    expect(mockSetBypass).toHaveBeenCalledWith(
      'net1',
      VPN.NodeHeight,
      ['n1', 'n2'],
      40,
    )
    expect(mockSetBypass).toHaveBeenCalledTimes(2)
  })

  it('returns NetworkNotFound when the style does not exist', () => {
    const result = visualStyleApi.setBypasses('missing', ['n1'], {
      [VPN.NodeBackgroundColor]: '#fff',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it('rejects empty elementIds', () => {
    setup()
    const result = visualStyleApi.setBypasses('net1', [], {
      [VPN.NodeBackgroundColor]: '#fff',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
    expect(mockSetBypass).not.toHaveBeenCalled()
  })

  it('applies nothing when any value is invalid (all-or-nothing)', () => {
    setup()
    const result = visualStyleApi.setBypasses('net1', ['n1'], {
      [VPN.NodeBackgroundColor]: '#ff0000',
      [VPN.NodeHeight]: 'tall' as any,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(StyleCodes.INVALID_NUMBER.code)
    }
    expect(mockSetBypass).not.toHaveBeenCalled()
  })

  it('rejects a scope mismatch (edge property on nodes) without applying', () => {
    setup()
    const result = visualStyleApi.setBypasses('net1', ['n1'], {
      [VPN.EdgeLineColor]: '#00ff00',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(StyleCodes.BYPASS_SCOPE_MISMATCH.code)
    }
    expect(mockSetBypass).not.toHaveBeenCalled()
  })
})

// --- deleteBypass ------------------------------------------------------------

describe('deleteBypass', () => {
  it('calls deleteBypass and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {}

    const result = visualStyleApi.deleteBypass(
      'net1',
      VPN.NodeBackgroundColor,
      ['n1'],
    )

    expect(result.success).toBe(true)
    expect(mockDeleteBypass).toHaveBeenCalledWith(
      'net1',
      VPN.NodeBackgroundColor,
      ['n1'],
    )
  })

  it('returns NetworkNotFound when visual style does not exist', () => {
    const result = visualStyleApi.deleteBypass(
      'missing',
      VPN.NodeBackgroundColor,
      ['n1'],
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })
})

// --- createDiscreteMapping ---------------------------------------------------

describe('createDiscreteMapping', () => {
  it('calls setMapping and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: {
        type: 'color',
        defaultValue: '#89D0F5',
        group: 'node',
      },
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
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it('builds a vpValueMap from string mapping entries when attributeType is string', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: {
        type: 'color',
        defaultValue: '#89D0F5',
        group: 'node',
      },
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
      [VPN.NodeBackgroundColor]: {
        type: 'color',
        defaultValue: '#fff',
        group: 'node',
      },
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
      expect(result.error.code).toBe(
        StyleCodes.MAPPING_ATTRIBUTE_UNDECLARED.code,
      )
    }
    expect(mockSetMapping).not.toHaveBeenCalled()
  })

  it('rejects an attributeType that mismatches the declared column type (CX2 MI2)', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeBackgroundColor]: {
        type: 'color',
        defaultValue: '#fff',
        group: 'node',
      },
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
      expect(result.error.code).toBe(StyleCodes.MAPPING_TYPE_MISMATCH.code)
    }
  })

  it('rejects a mapping on a network-scoped visual property (CX2 MC1)', () => {
    mockVisualStyles['net1'] = {
      [VPN.NetworkBackgroundColor]: {
        type: 'color',
        defaultValue: '#fff',
        group: 'network',
      },
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
      expect(result.error.code).toBe(
        StyleCodes.NETWORK_SCOPED_MAPPING_FORBIDDEN.code,
      )
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
      {
        vpType: 'number',
        attribute: 'score',
        attributeValues: [0, 50, 100],
        attributeType: 'double',
      },
    )

    expect(result.success).toBe(true)
    expect(mockCreateContinuousMapping).toHaveBeenCalledWith(
      'net1',
      VPN.NodeHeight,
      'number',
      'score',
      [0, 50, 100],
      'double',
    )
  })

  it('returns NetworkNotFound when visual style does not exist', () => {
    const result = visualStyleApi.createContinuousMapping(
      'missing',
      VPN.NodeHeight,
      {
        vpType: 'number',
        attribute: 'score',
        attributeValues: [],
        attributeType: 'double',
      },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
    expect(mockSetContinuousMappingValues).not.toHaveBeenCalled()
  })

  it('falls back to the computed defaults when no overrides are given', () => {
    mockVisualStyles['net1'] = {
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    declareColumns([{ name: 'score', type: 'double' }])

    visualStyleApi.createContinuousMapping('net1', VPN.NodeHeight, {
      vpType: 'number',
      attribute: 'score',
      attributeValues: [0, 50, 100],
      attributeType: 'double',
    })

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

    visualStyleApi.createContinuousMapping('net1', VPN.NodeHeight, {
      vpType: 'number',
      attribute: 'score',
      attributeValues: [0, 50, 100],
      attributeType: 'double',
      controlPoints,
    })

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
      [VPN.NodeBackgroundColor]: {
        type: 'color',
        defaultValue: '#ffffff',
        group: 'node',
      },
    }
    declareColumns([{ name: 'score', type: 'double' }])

    const controlPoints = [
      { value: 0, vpValue: '#000000', inclusive: true },
      { value: 100, vpValue: '#ff0000' },
    ]

    visualStyleApi.createContinuousMapping('net1', VPN.NodeBackgroundColor, {
      vpType: 'color',
      attribute: 'score',
      attributeValues: [0, 100],
      attributeType: 'double',
      controlPoints,
      ltMinVpValue: '#ffffff',
      gtMaxVpValue: '#ff0000',
    })

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

    visualStyleApi.createContinuousMapping('net1', VPN.NodeHeight, {
      vpType: 'number',
      attribute: 'score',
      attributeValues: [0, 50, 100],
      attributeType: 'double',
      ltMinVpValue: 'customLtMin',
      gtMaxVpValue: 'customGtMax',
    })

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
      {
        vpType: 'number',
        attribute: 'score',
        attributeValues: ['low', 'high'] as any,
        attributeType: 'double',
      },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(
        StyleCodes.CONTINUOUS_MAPPING_NOT_NUMERIC.code,
      )
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
      {
        vpType: 'number',
        attribute: 'score',
        attributeValues: [0, NaN, Infinity],
        attributeType: 'double',
      },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(
        StyleCodes.CONTINUOUS_MAPPING_NOT_NUMERIC.code,
      )
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
      {
        vpType: 'number',
        attribute: 'score',
        attributeValues: [],
        attributeType: 'double',
      },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(
        StyleCodes.CONTINUOUS_MAPPING_NOT_NUMERIC.code,
      )
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
      {
        vpType: 'number',
        attribute: 'score',
        attributeValues: [0, 100],
        attributeType: 'double',
        controlPoints: [
          { value: 'zero' as any, vpValue: 20 },
          { value: 100, vpValue: 60 },
        ],
      },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(
        StyleCodes.CONTINUOUS_MAPPING_NOT_NUMERIC.code,
      )
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
      {
        vpType: 'number',
        attribute: 'label',
        attributeValues: ['a', 'b'],
        attributeType: 'string',
      },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(StyleCodes.MAPPING_REQUIRES_NUMERIC.code)
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
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
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
      expect(result.error.code).toBe(
        StyleCodes.MAPPING_ATTRIBUTE_UNDECLARED.code,
      )
    }
    expect(mockCreatePassthroughMapping).not.toHaveBeenCalled()
  })
})

// --- deleteMapping -----------------------------------------------------------

describe('deleteMapping', () => {
  it('calls removeMapping and returns ok() when network exists', () => {
    mockVisualStyles['net1'] = {}

    const result = visualStyleApi.deleteMapping('net1', VPN.NodeBackgroundColor)

    expect(result.success).toBe(true)
    expect(mockRemoveMapping).toHaveBeenCalledWith(
      'net1',
      VPN.NodeBackgroundColor,
    )
  })

  it('returns NetworkNotFound when visual style does not exist', () => {
    const result = visualStyleApi.deleteMapping(
      'missing',
      VPN.NodeBackgroundColor,
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })
})

// --- networkModified flag (#680) ---------------------------------------------
//
// Style writes through the app API used to be marked only as a side effect of
// a WorkspaceEditor subscription that selected on `currentNetworkId`. Every
// method here takes an explicit networkId, and non-current networks stay
// resident in the stores, so the mark has to follow the argument.

describe('networkModified (#680)', () => {
  /** A resident network that is NOT currentNetworkId (the mock reports net1). */
  const NET = 'net2'

  function setupNet2(): void {
    mockVisualStyles[NET] = {
      [VPN.NodeBackgroundColor]: {
        type: 'color',
        defaultValue: '#89D0F5',
        group: 'node',
      },
      [VPN.NodeLabel]: { type: 'string', defaultValue: '', group: 'node' },
      [VPN.NodeHeight]: { type: 'number', defaultValue: 10, group: 'node' },
    }
    mockTables[NET] = {
      nodeTable: {
        rows: new Map(),
        columns: [
          { name: 'type', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'score', type: 'double' },
        ],
      },
      edgeTable: { rows: new Map(), columns: [] },
    }
    mockNetworks.set(NET, {
      id: NET,
      nodes: [{ id: 'n1' }, { id: 'n2' }],
      edges: [],
    })
  }

  const expectMarked = (): void => {
    expect(mockSetNetworkModified).toHaveBeenCalledWith(NET, true)
    expect(mockSetNetworkModified).not.toHaveBeenCalledWith('net1', true)
  }

  beforeEach(setupNet2)

  it('setDefault marks the written network', () => {
    expect(
      visualStyleApi.setDefault(NET, VPN.NodeBackgroundColor, '#ff0000')
        .success,
    ).toBe(true)
    expectMarked()
  })

  it('setDefaults marks the written network', () => {
    const result = visualStyleApi.setDefaults(NET, {
      [VPN.NodeBackgroundColor]: '#ff0000',
    })

    expect(result.success).toBe(true)
    expectMarked()
  })

  it('setBypass marks the written network', () => {
    const result = visualStyleApi.setBypass(
      NET,
      VPN.NodeBackgroundColor,
      ['n1'],
      '#ff0000',
    )

    expect(result.success).toBe(true)
    expectMarked()
  })

  it('setBypasses marks the written network', () => {
    const result = visualStyleApi.setBypasses(NET, ['n1'], {
      [VPN.NodeBackgroundColor]: '#ff0000',
    })

    expect(result.success).toBe(true)
    expectMarked()
  })

  it('deleteBypass marks the written network when a bypass is removed', () => {
    mockVisualStyles[NET][VPN.NodeBackgroundColor].bypassMap = new Map([
      ['n1', '#ff0000'],
    ])

    const result = visualStyleApi.deleteBypass(NET, VPN.NodeBackgroundColor, [
      'n1',
    ])

    expect(result.success).toBe(true)
    expectMarked()
  })

  it('deleteBypass marks nothing when no element had a bypass', () => {
    // `visualStyleImpl.deleteBypass` drops ids whether or not they were
    // present, so a speculative clear must not dirty a clean network.
    mockVisualStyles[NET][VPN.NodeBackgroundColor].bypassMap = new Map([
      ['n2', '#ff0000'],
    ])

    const result = visualStyleApi.deleteBypass(NET, VPN.NodeBackgroundColor, [
      'n1',
    ])

    expect(result.success).toBe(true)
    expect(mockDeleteBypass).toHaveBeenCalled()
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })

  it('createDiscreteMapping marks the written network', () => {
    const result = visualStyleApi.createDiscreteMapping(
      NET,
      VPN.NodeBackgroundColor,
      'type',
      'string',
    )

    expect(result.success).toBe(true)
    expectMarked()
  })

  it('createContinuousMapping marks the written network', () => {
    const result = visualStyleApi.createContinuousMapping(NET, VPN.NodeHeight, {
      vpType: 'number',
      attribute: 'score',
      attributeValues: [0, 50, 100],
      attributeType: 'double',
    })

    expect(result.success).toBe(true)
    expectMarked()
  })

  it('createPassthroughMapping marks the written network', () => {
    const result = visualStyleApi.createPassthroughMapping(
      NET,
      VPN.NodeLabel,
      'name',
      'string',
    )

    expect(result.success).toBe(true)
    expectMarked()
  })

  it('deleteMapping marks the written network when a mapping existed', () => {
    mockVisualStyles[NET][VPN.NodeBackgroundColor].mapping = {
      attribute: 'type',
      type: 'discrete',
    }

    const result = visualStyleApi.deleteMapping(NET, VPN.NodeBackgroundColor)

    expect(result.success).toBe(true)
    expectMarked()
  })

  it('deleteMapping marks nothing when there was no mapping', () => {
    const result = visualStyleApi.deleteMapping(NET, VPN.NodeBackgroundColor)

    expect(result.success).toBe(true)
    expect(mockRemoveMapping).toHaveBeenCalled()
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })

  it('setDefaults marks nothing when given an empty map', () => {
    const result = visualStyleApi.setDefaults(NET, {})

    expect(result.success).toBe(true)
    expect(mockSetDefault).not.toHaveBeenCalled()
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })

  it('setBypasses marks nothing when given an empty map', () => {
    const result = visualStyleApi.setBypasses(NET, ['n1'], {})

    expect(result.success).toBe(true)
    expect(mockSetBypass).not.toHaveBeenCalled()
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })

  it('does not mark when the write is rejected', () => {
    const result = visualStyleApi.setBypass(
      NET,
      VPN.NodeBackgroundColor,
      ['ghost'],
      '#ff0000',
    )

    expect(result.success).toBe(false)
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })

  it('does not mark when the network does not exist', () => {
    const result = visualStyleApi.setDefault(
      'missing',
      VPN.NodeBackgroundColor,
      '#ff0000',
    )

    expect(result.success).toBe(false)
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })
})
