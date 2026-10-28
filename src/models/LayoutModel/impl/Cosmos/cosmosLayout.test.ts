import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Edge, Node } from '../../../NetworkModel'
import { cosmos } from './Algorithms/cosmos'
import {
  CosmosLayout,
  fromCosmosPositions,
  toCosmosInput,
} from './cosmosLayout'

const graphMock = vi.hoisted(() => ({
  config: undefined as unknown,
  setPointPositions: vi.fn(),
  setLinks: vi.fn(),
  render: vi.fn(),
  pause: vi.fn(),
  destroy: vi.fn(),
  getPointPositions: vi.fn((): number[] => []),
}))

vi.mock('@cosmos.gl/graph', () => ({
  Graph: class {
    constructor(_div: HTMLDivElement, config: unknown) {
      graphMock.config = config
    }
    setPointPositions = graphMock.setPointPositions
    setLinks = graphMock.setLinks
    render = graphMock.render
    pause = graphMock.pause
    destroy = graphMock.destroy
    getPointPositions = graphMock.getPointPositions
  },
}))

const nodes: Node[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
const edge = (id: string, s: string, t: string): Edge => ({ id, s, t })

describe('toCosmosInput', () => {
  it('maps edges to pairs of node indices', () => {
    const { links } = toCosmosInput(nodes, [
      edge('e1', 'a', 'b'),
      edge('e2', 'c', 'a'),
    ])
    expect(Array.from(links)).toEqual([0, 1, 2, 0])
  })

  it('drops edges whose source or target is not a node', () => {
    const { links } = toCosmosInput(nodes, [
      edge('e1', 'a', 'missing'),
      edge('e2', 'missing', 'b'),
      edge('e3', 'b', 'c'),
    ])
    expect(Array.from(links)).toEqual([1, 2])
  })

  it('seeds every node within 0.5% of the center of a 4096 space', () => {
    const low = Array.from(toCosmosInput(nodes, [], () => 0).pointPositions)
    const high = Array.from(toCosmosInput(nodes, [], () => 1).pointPositions)
    expect(low).toHaveLength(6)
    low.forEach((v) => expect(v).toBeCloseTo(4096 * 0.495, 2))
    high.forEach((v) => expect(v).toBeCloseTo(4096 * 0.505, 2))
  })

  it('handles an empty network', () => {
    const { pointPositions, links } = toCosmosInput([], [])
    expect(pointPositions).toHaveLength(0)
    expect(links).toHaveLength(0)
  })
})

describe('fromCosmosPositions', () => {
  it('maps positions back to node ids, scaled 10x', () => {
    const map = fromCosmosPositions(nodes, [1, 2, 3, 4, 5, 6])
    expect(Array.from(map.entries())).toEqual([
      ['a', [10, 20]],
      ['b', [30, 40]],
      ['c', [50, 60]],
    ])
  })
})

describe('CosmosLayout.apply', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs the simulation, reports positions, and destroys the graph', async () => {
    graphMock.getPointPositions.mockReturnValue([1, 1, 2, 2, 3, 3])
    const afterLayout = vi.fn()

    const done = CosmosLayout.apply(
      nodes,
      [edge('e1', 'a', 'b')],
      afterLayout,
      cosmos,
    )
    await vi.waitFor(() => expect(graphMock.render).toHaveBeenCalled())
    expect(graphMock.config).toMatchObject({
      spaceSize: 4096,
      rescalePositions: false,
      simulationLinkSpring: 0.1,
      simulationLinkDistance: 15,
      simulationRepulsion: 2.0,
      simulationGravity: 0.3,
    })
    expect(Array.from(graphMock.setLinks.mock.calls[0][0])).toEqual([0, 1])
    expect(afterLayout).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2400)
    await done

    expect(graphMock.pause).toHaveBeenCalled()
    expect(afterLayout).toHaveBeenCalledWith(
      new Map([
        ['a', [10, 10]],
        ['b', [20, 20]],
        ['c', [30, 30]],
      ]),
    )
    expect(graphMock.destroy).toHaveBeenCalledTimes(1)
  })

  it('destroys the graph and rejects when reading positions fails', async () => {
    graphMock.getPointPositions.mockImplementation(() => {
      throw new Error('context lost')
    })
    const done = CosmosLayout.apply(nodes, [], vi.fn(), cosmos)
    const assertion = expect(done).rejects.toThrow('context lost')
    await vi.waitFor(() => expect(graphMock.render).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(2400)
    await assertion
    expect(graphMock.destroy).toHaveBeenCalledTimes(1)
  })
})
