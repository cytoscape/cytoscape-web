// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { logUi } from '../../../debug'
import { LayoutAlgorithm } from '../../../models/LayoutModel/LayoutAlgorithm'
import { LayoutEngine } from '../../../models/LayoutModel/LayoutEngine'
import { Network } from '../../../models/NetworkModel'
import { runEngineLayout } from './runEngineLayout'

vi.mock('../../../debug', () => ({
  logUi: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const algorithm = {
  name: 'x',
  engineName: 'E',
  displayName: 'X',
  type: 'other',
  description: '',
  parameters: {},
} as LayoutAlgorithm

const network = {
  id: 'net1',
  nodes: [{ id: 'n1' }],
  edges: [],
} as unknown as Network

const makeEngine = (apply: LayoutEngine['apply']): LayoutEngine => ({
  name: 'E',
  defaultAlgorithmName: 'x',
  algorithms: { x: algorithm },
  apply,
})

describe('runEngineLayout', () => {
  const afterLayout = vi.fn()
  const setIsRunning = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes the network id as the fifth apply argument and leaves isRunning up', () => {
    const apply = vi.fn()
    runEngineLayout({
      engine: makeEngine(apply),
      algorithm,
      network,
      networkId: 'net1',
      afterLayout,
      setIsRunning,
    })

    expect(apply).toHaveBeenCalledWith(
      network.nodes,
      network.edges,
      afterLayout,
      algorithm,
      'net1',
    )
    expect(setIsRunning).toHaveBeenCalledTimes(1)
    expect(setIsRunning).toHaveBeenCalledWith(true)
  })

  it('resets isRunning and logs when apply throws synchronously', () => {
    runEngineLayout({
      engine: makeEngine(() => {
        throw new Error('sync boom')
      }),
      algorithm,
      network,
      networkId: 'net1',
      afterLayout,
      setIsRunning,
    })

    expect(setIsRunning).toHaveBeenNthCalledWith(1, true)
    expect(setIsRunning).toHaveBeenNthCalledWith(2, false)
    expect(logUi.error).toHaveBeenCalledTimes(1)
    expect(afterLayout).not.toHaveBeenCalled()
  })

  it('resets isRunning and logs when apply returns a rejected promise', async () => {
    runEngineLayout({
      engine: makeEngine(() => Promise.reject(new Error('async boom'))),
      algorithm,
      network,
      networkId: 'net1',
      afterLayout,
      setIsRunning,
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(setIsRunning).toHaveBeenNthCalledWith(2, false)
    expect(logUi.error).toHaveBeenCalledTimes(1)
  })

  it('does not reset isRunning when a returned promise resolves (afterLayout owns that)', async () => {
    runEngineLayout({
      engine: makeEngine(() => Promise.resolve()),
      algorithm,
      network,
      networkId: 'net1',
      afterLayout,
      setIsRunning,
    })
    await Promise.resolve()

    expect(setIsRunning).toHaveBeenCalledTimes(1)
    expect(logUi.error).not.toHaveBeenCalled()
  })
})
