// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { logUi } from '../../../debug'
import { Network } from '../../NetworkModel'
import { LayoutAlgorithm } from '../LayoutAlgorithm'
import { LayoutEngine } from '../LayoutEngine'
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
  const startLayout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    startLayout.mockReturnValue(true)
  })

  it('claims the run for the network, then passes the network id as the fifth apply argument', () => {
    const apply = vi.fn()
    const started = runEngineLayout({
      engine: makeEngine(apply),
      algorithm,
      network,
      networkId: 'net1',
      afterLayout,
      startLayout,
      setIsRunning,
    })

    expect(started).toBe(true)
    expect(startLayout).toHaveBeenCalledWith('net1')
    expect(apply).toHaveBeenCalledWith(
      network.nodes,
      network.edges,
      afterLayout,
      algorithm,
      'net1',
    )
    // The running flag stays up until afterLayout lowers it.
    expect(setIsRunning).not.toHaveBeenCalled()
  })

  // #982: a second layout while one runs is refused, so the two cannot
  // overwrite each other's positions or lower each other's running flag.
  it('refuses to start while another layout runs, without touching the flag', () => {
    startLayout.mockReturnValue(false)
    const apply = vi.fn()

    const started = runEngineLayout({
      engine: makeEngine(apply),
      algorithm,
      network,
      networkId: 'net1',
      afterLayout,
      startLayout,
      setIsRunning,
    })

    expect(started).toBe(false)
    expect(apply).not.toHaveBeenCalled()
    expect(setIsRunning).not.toHaveBeenCalled()
    expect(afterLayout).not.toHaveBeenCalled()
    expect(logUi.warn).toHaveBeenCalledTimes(1)
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
      startLayout,
      setIsRunning,
    })

    expect(setIsRunning).toHaveBeenCalledTimes(1)
    expect(setIsRunning).toHaveBeenCalledWith(false)
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
      startLayout,
      setIsRunning,
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(setIsRunning).toHaveBeenCalledWith(false)
    expect(logUi.error).toHaveBeenCalledTimes(1)
  })

  it('does not reset isRunning when a returned promise resolves (afterLayout owns that)', async () => {
    runEngineLayout({
      engine: makeEngine(() => Promise.resolve()),
      algorithm,
      network,
      networkId: 'net1',
      afterLayout,
      startLayout,
      setIsRunning,
    })
    await Promise.resolve()

    expect(setIsRunning).not.toHaveBeenCalled()
    expect(logUi.error).not.toHaveBeenCalled()
  })
})
