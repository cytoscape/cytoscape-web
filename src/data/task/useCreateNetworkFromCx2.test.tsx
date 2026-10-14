import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Cx2 } from '../../models/CxModel/Cx2'
import { useNetworkStore } from '../hooks/stores/NetworkStore'
import { useCreateNetworkFromCx2 } from './useCreateNetworkFromCx2'

// Mock the database operations to avoid IndexedDB issues in tests
vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  return { ...actual }
})

// The hook uses react-router navigation, which needs a Router context
vi.mock('../hooks/navigation/useUrlNavigation', () => ({
  useUrlNavigation: () => ({
    navigateToNetwork: vi.fn(),
  }),
}))

describe('useCreateNetworkFromCx2', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useNetworkStore())
    act(() => {
      result.current.deleteAll()
    })
  })

  it('creates a network from valid CX2', () => {
    const validCx: Cx2 = [
      { CXVersion: '2.0' },
      {
        metaData: [
          { name: 'nodes', elementCount: 2 },
          { name: 'edges', elementCount: 1 },
        ],
      },
      { nodes: [{ id: 1 }, { id: 2 }] },
      { edges: [{ id: 1, s: 1, t: 2 }] },
      { status: [{ success: true }] },
    ] as Cx2

    const { result } = renderHook(() => useCreateNetworkFromCx2())

    let cyNetwork: any
    act(() => {
      cyNetwork = result.current({ cxData: validCx, addToWorkspace: false })
    })

    expect(cyNetwork.network.nodes).toHaveLength(2)
    expect(cyNetwork.network.edges).toHaveLength(1)
  })

  // REVIEW.md R2-21: this hook is exposed to external apps via Module
  // Federation ('./CreateNetworkFromCx2') but used to call the explicitly
  // NON-validating converter on external data — the one entry point
  // violating EXTERNAL_INPUT_VALIDATION_POLICY.md. Malformed CX2 crashed
  // deep inside cytoscape.js instead of being rejected up front.
  it('rejects invalid CX2 with a validation error (regression: R2-21)', () => {
    const invalidCx: Cx2 = [
      { CXVersion: '2.0' },
      {
        metaData: [
          { name: 'nodes', elementCount: 1 },
          { name: 'edges', elementCount: 1 },
        ],
      },
      { nodes: [{ id: 1 }] },
      // Edge references a node that does not exist
      { edges: [{ id: 1, s: 1, t: 999 }] },
      { status: [{ success: true }] },
    ] as Cx2

    const { result } = renderHook(() => useCreateNetworkFromCx2())

    expect(() => {
      act(() => {
        result.current({ cxData: invalidCx, addToWorkspace: false })
      })
    }).toThrow(/validation/i)
  })
})
