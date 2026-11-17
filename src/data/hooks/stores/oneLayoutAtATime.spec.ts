// #982: only one layout at a time. Two layouts started on the same network
// used to both run: the faster one applied first, then the slower one (Cosmos
// returns after a fixed timer) overwrote it, both were recorded as undo
// steps, and whichever finished first lowered the shared running flag while
// the other still ran. These tests drive the real LayoutStore through the
// shared runner every host path uses.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IdType } from '../../../models/IdType'
import { runEngineLayout } from '../../../models/LayoutModel/impl/runEngineLayout'
import { LayoutAlgorithm } from '../../../models/LayoutModel/LayoutAlgorithm'
import { LayoutEngine } from '../../../models/LayoutModel/LayoutEngine'
import { Network } from '../../../models/NetworkModel'
import { useLayoutStore } from './LayoutStore'
import { runLayoutWhenIdle } from './runLayoutWhenIdle'

vi.mock('../../../debug', () => ({
  logUi: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

type Positions = Map<IdType, [number, number]>

const network = {
  id: 'net1',
  nodes: [{ id: 'n1' }],
  edges: [],
} as unknown as Network

const algorithmOf = (engineName: string): LayoutAlgorithm => ({
  name: engineName,
  engineName,
  displayName: engineName,
  type: 'force',
  description: '',
  parameters: {},
})

/** An engine that returns its positions after a fixed delay, like Cosmos. */
const timedEngine = (
  name: string,
  delayMs: number,
  position: [number, number],
): LayoutEngine => ({
  name,
  defaultAlgorithmName: name,
  algorithms: { [name]: algorithmOf(name) },
  apply: (_nodes, _edges, afterLayout) => {
    setTimeout(() => afterLayout(new Map([['n1', position]])), delayMs)
  },
})

/** An engine that answers synchronously, like most Cytoscape.js layouts. */
const syncEngine = (
  name: string,
  position: [number, number],
): LayoutEngine => ({
  name,
  defaultAlgorithmName: name,
  algorithms: { [name]: algorithmOf(name) },
  apply: (_nodes, _edges, afterLayout) => {
    afterLayout(new Map([['n1', position]]))
  },
})

describe('one layout at a time (#982)', () => {
  // Stand-ins for the view model and the undo stack the UI writes in
  // afterLayout (updateNodePositions + postEdit).
  let applied: Positions[]
  let undoEntries: string[]

  const run = (engine: LayoutEngine): boolean => {
    const { startLayout, setIsRunning } = useLayoutStore.getState()
    return runEngineLayout({
      engine,
      algorithm: engine.algorithms[engine.defaultAlgorithmName],
      network,
      networkId: 'net1',
      afterLayout: (positions) => {
        applied.push(positions)
        undoEntries.push(`Apply ${engine.name} layout`)
        setIsRunning(false)
      },
      startLayout,
      setIsRunning,
    })
  }

  beforeEach(() => {
    vi.useFakeTimers()
    applied = []
    undoEntries = []
    useLayoutStore.getState().setIsRunning(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    useLayoutStore.getState().setIsRunning(false)
  })

  it('refuses a second layout on the same network while the first runs', () => {
    expect(run(timedEngine('cosmos', 2400, [100, 100]))).toBe(true)
    // "Apply default layout" right away
    expect(run(syncEngine('default', [5, 5]))).toBe(false)

    // The refused run neither applied anything nor lowered the flag.
    expect(applied).toHaveLength(0)
    expect(useLayoutStore.getState().isRunning).toBe(true)
    expect(useLayoutStore.getState().runningNetworkId).toBe('net1')

    vi.advanceTimersByTime(2400)

    expect(applied).toEqual([new Map([['n1', [100, 100]]])])
    expect(undoEntries).toEqual(['Apply cosmos layout'])
    expect(useLayoutStore.getState().isRunning).toBe(false)
  })

  it('accepts the next layout once the first has finished', () => {
    run(timedEngine('cosmos', 2400, [100, 100]))
    vi.advanceTimersByTime(2400)

    expect(run(syncEngine('default', [5, 5]))).toBe(true)
    expect(undoEntries).toEqual(['Apply cosmos layout', 'Apply default layout'])
  })

  describe('runLayoutWhenIdle (automatic layouts wait their turn)', () => {
    // A waiting layout starts one microtask after the flag drops: after the
    // finishing layout's callback has returned, before any user event.
    const flushMicrotasks = async (): Promise<void> => {
      await Promise.resolve()
      await Promise.resolve()
    }

    it('starts at once when no layout runs', () => {
      runLayoutWhenIdle(() => run(syncEngine('auto', [1, 1])))
      expect(undoEntries).toEqual(['Apply auto layout'])
    })

    it('waits for the running layout, then starts', async () => {
      run(timedEngine('cosmos', 2400, [100, 100]))
      runLayoutWhenIdle(() => run(syncEngine('auto', [1, 1])))

      expect(undoEntries).toEqual([])
      vi.advanceTimersByTime(2400)
      await flushMicrotasks()

      expect(undoEntries).toEqual(['Apply cosmos layout', 'Apply auto layout'])
      expect(applied.at(-1)).toEqual(new Map([['n1', [1, 1]]]))
      expect(useLayoutStore.getState().isRunning).toBe(false)
    })

    it('runs two waiting layouts one after the other, each once', async () => {
      run(timedEngine('cosmos', 2400, [100, 100]))
      runLayoutWhenIdle(() => run(timedEngine('first', 1000, [1, 1])))
      runLayoutWhenIdle(() => run(timedEngine('second', 1000, [2, 2])))

      vi.advanceTimersByTime(2400)
      await flushMicrotasks()
      // Only one of the waiting layouts took the freed slot.
      expect(useLayoutStore.getState().isRunning).toBe(true)
      expect(undoEntries).toEqual(['Apply cosmos layout'])

      vi.advanceTimersByTime(1000)
      await flushMicrotasks()
      vi.advanceTimersByTime(1000)
      await flushMicrotasks()
      expect(undoEntries).toEqual([
        'Apply cosmos layout',
        'Apply first layout',
        'Apply second layout',
      ])
      expect(useLayoutStore.getState().isRunning).toBe(false)
    })

    it('does not run again when a synchronous layout lowers the flag while starting', async () => {
      run(timedEngine('cosmos', 2400, [100, 100]))
      const tryStart = vi.fn(() => run(syncEngine('auto', [1, 1])))
      runLayoutWhenIdle(tryStart)

      vi.advanceTimersByTime(2400)
      await flushMicrotasks()
      useLayoutStore.getState().setIsRunning(false)
      await flushMicrotasks()

      expect(tryStart).toHaveBeenCalledTimes(1)
      expect(undoEntries).toEqual(['Apply cosmos layout', 'Apply auto layout'])
    })

    it('starts nothing once cancelled', async () => {
      run(timedEngine('cosmos', 2400, [100, 100]))
      const tryStart = vi.fn(() => run(syncEngine('auto', [1, 1])))
      const cancel = runLayoutWhenIdle(tryStart)

      cancel()
      vi.advanceTimersByTime(2400)
      await flushMicrotasks()

      expect(tryStart).not.toHaveBeenCalled()
      expect(undoEntries).toEqual(['Apply cosmos layout'])
    })

    // The finishing layout lowers the flag inside its own completion
    // callback. Starting the waiting layout right there would run it nested
    // in that callback, before the callback's remaining work (the App API's
    // layout:completed, the menu's fit), and a queue of synchronous layouts
    // would nest one call stack per layout.
    it('starts only after the finishing layout callback has returned', async () => {
      const log: string[] = []
      const { startLayout, setIsRunning } = useLayoutStore.getState()
      runEngineLayout({
        engine: timedEngine('cosmos', 2400, [100, 100]),
        algorithm: algorithmOf('cosmos'),
        network,
        networkId: 'net1',
        afterLayout: () => {
          setIsRunning(false)
          log.push('cosmos callback returned')
        },
        startLayout,
        setIsRunning,
      })
      runLayoutWhenIdle(() => {
        log.push('auto started')
        return run(syncEngine('auto', [1, 1]))
      })
      runLayoutWhenIdle(() => {
        log.push('second auto started')
        return run(syncEngine('auto', [2, 2]))
      })

      vi.advanceTimersByTime(2400)
      expect(log).toEqual(['cosmos callback returned'])

      await flushMicrotasks()
      await flushMicrotasks()
      expect(log).toEqual([
        'cosmos callback returned',
        'auto started',
        'second auto started',
      ])
    })
  })
})
