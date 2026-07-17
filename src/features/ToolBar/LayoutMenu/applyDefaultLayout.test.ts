import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { LayoutAlgorithm } from '../../../models'
import { LayoutEngine } from '../../../models/LayoutModel/LayoutEngine'
import { Network } from '../../../models/NetworkModel'
import { applyDefaultLayout } from './applyDefaultLayout'

const makeAlgorithm = (
  engineName: string,
  name = 'gForce',
): LayoutAlgorithm =>
  ({
    name,
    displayName: 'gForce',
    engineName,
    description: 'test',
    parameters: {},
    editables: {},
    apply: vi.fn(),
  }) as unknown as LayoutAlgorithm

const makeEngine = (name: string): LayoutEngine =>
  ({
    name,
    algorithms: {},
    apply: vi.fn(),
  }) as unknown as LayoutEngine

const makeNetwork = (): Network =>
  ({
    id: 'net1',
    nodes: [{ id: 'n1' }],
    edges: [{ id: 'e1', s: 'n1', t: 'n1' }],
  }) as unknown as Network

describe('applyDefaultLayout (CW-539)', () => {
  let setIsRunning: Mock<(isRunning: boolean) => void>
  let afterLayout: Mock<(positionMap: Map<string, [number, number]>) => void>

  beforeEach(() => {
    setIsRunning = vi.fn<(isRunning: boolean) => void>()
    afterLayout = vi.fn<(positionMap: Map<string, [number, number]>) => void>()
  })

  it('applies the preferred layout using its owning engine', () => {
    const g6 = makeEngine('G6')
    const cyjs = makeEngine('Cytoscape')
    const preferred = makeAlgorithm('G6')
    const network = makeNetwork()

    const result = applyDefaultLayout({
      layoutEngines: [cyjs, g6],
      preferredLayout: preferred,
      network,
      afterLayout,
      setIsRunning,
    })

    expect(result).toBe(true)
    expect(setIsRunning).toHaveBeenCalledWith(true)
    // The engine that owns the preferred algorithm runs it, not the first engine.
    expect(g6.apply).toHaveBeenCalledWith(
      network.nodes,
      network.edges,
      afterLayout,
      preferred,
    )
    expect(cyjs.apply).not.toHaveBeenCalled()
  })

  it('falls back to the first engine when the preferred engine name is unknown', () => {
    const first = makeEngine('Cytoscape')
    const preferred = makeAlgorithm('NonexistentEngine')
    const network = makeNetwork()

    const result = applyDefaultLayout({
      layoutEngines: [first],
      preferredLayout: preferred,
      network,
      afterLayout,
      setIsRunning,
    })

    expect(result).toBe(true)
    expect(first.apply).toHaveBeenCalledWith(
      network.nodes,
      network.edges,
      afterLayout,
      preferred,
    )
  })

  it('does nothing when there is no network (no-network / disabled case)', () => {
    const engine = makeEngine('G6')

    const result = applyDefaultLayout({
      layoutEngines: [engine],
      preferredLayout: makeAlgorithm('G6'),
      network: undefined,
      afterLayout,
      setIsRunning,
    })

    expect(result).toBe(false)
    expect(setIsRunning).not.toHaveBeenCalled()
    expect(engine.apply).not.toHaveBeenCalled()
  })

  it('does nothing when the target has no nodes (empty {} network placeholder)', () => {
    const engine = makeEngine('G6')

    const result = applyDefaultLayout({
      layoutEngines: [engine],
      preferredLayout: makeAlgorithm('G6'),
      network: {} as Network,
      afterLayout,
      setIsRunning,
    })

    expect(result).toBe(false)
    expect(engine.apply).not.toHaveBeenCalled()
  })
})
