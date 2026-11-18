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
import { useNetworkStore } from './NetworkStore'
import { ClaimLayout, runLayoutWhenIdle } from './runLayoutWhenIdle'

vi.mock('../../../debug', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../debug')>()),
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

  /**
   * Start `engine` on net1 the way the host does. A queued start passes the
   * claim runLayoutWhenIdle hands it; an immediate one uses the store's.
   */
  const run = (engine: LayoutEngine, claim?: ClaimLayout): boolean => {
    const { setIsRunning } = useLayoutStore.getState()
    const startLayout = claim ?? useLayoutStore.getState().startLayout
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
      runLayoutWhenIdle((claim) => run(syncEngine('auto', [1, 1]), claim))
      expect(undoEntries).toEqual(['Apply auto layout'])
    })

    it('waits for the running layout, then starts', async () => {
      run(timedEngine('cosmos', 2400, [100, 100]))
      runLayoutWhenIdle((claim) => run(syncEngine('auto', [1, 1]), claim))

      expect(undoEntries).toEqual([])
      vi.advanceTimersByTime(2400)
      await flushMicrotasks()

      expect(undoEntries).toEqual(['Apply cosmos layout', 'Apply auto layout'])
      expect(applied.at(-1)).toEqual(new Map([['n1', [1, 1]]]))
      expect(useLayoutStore.getState().isRunning).toBe(false)
    })

    it('runs two waiting layouts one after the other, each once', async () => {
      run(timedEngine('cosmos', 2400, [100, 100]))
      runLayoutWhenIdle((claim) =>
        run(timedEngine('first', 1000, [1, 1]), claim),
      )
      runLayoutWhenIdle((claim) =>
        run(timedEngine('second', 1000, [2, 2]), claim),
      )

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
      const tryStart = vi.fn((claim: ClaimLayout) =>
        run(syncEngine('auto', [1, 1]), claim),
      )
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
      const tryStart = vi.fn((claim: ClaimLayout) =>
        run(syncEngine('auto', [1, 1]), claim),
      )
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
      runLayoutWhenIdle((claim) => {
        log.push('auto started')
        return run(syncEngine('auto', [1, 1]), claim)
      })
      runLayoutWhenIdle((claim) => {
        log.push('second auto started')
        return run(syncEngine('auto', [2, 2]), claim)
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

    // Review of #985: the slot freed by a finishing layout belongs to the
    // layouts already waiting. A start made synchronously after the flag
    // drops (a layout:completed listener, say) used to take it first, and
    // repeated such starts could keep a waiting layout from ever running.
    it('keeps the freed slot for the layouts already waiting', async () => {
      const log: string[] = []
      const { startLayout, setIsRunning } = useLayoutStore.getState()
      let jumped: boolean | undefined
      runEngineLayout({
        engine: timedEngine('cosmos', 2400, [100, 100]),
        algorithm: algorithmOf('cosmos'),
        network,
        networkId: 'net1',
        afterLayout: () => {
          setIsRunning(false)
          // Something tries to start a layout right away
          jumped = run(syncEngine('jumper', [9, 9]))
        },
        startLayout,
        setIsRunning,
      })
      runLayoutWhenIdle((claim) => {
        log.push('waiting layout started')
        return run(syncEngine('auto', [1, 1]), claim)
      })

      vi.advanceTimersByTime(2400)
      await flushMicrotasks()

      expect(jumped).toBe(false)
      expect(log).toEqual(['waiting layout started'])
      expect(undoEntries).toEqual(['Apply auto layout'])
    })

    it('lets an immediate start through again once nothing waits', async () => {
      run(timedEngine('cosmos', 2400, [100, 100]))
      runLayoutWhenIdle((claim) => run(syncEngine('auto', [1, 1]), claim))
      vi.advanceTimersByTime(2400)
      await flushMicrotasks()

      expect(run(syncEngine('later', [2, 2]))).toBe(true)
    })

    // Review of #985: a network deleted and added again under the same id
    // while its layout waits must not get the old job's layout.
    describe('with a network to watch', () => {
      const addNetwork = (): void => {
        useNetworkStore
          .getState()
          .add({ id: 'watched', nodes: [], edges: [] } as unknown as Network)
      }

      beforeEach(() => {
        useNetworkStore.getState().delete('watched')
        addNetwork()
      })

      it('stops waiting when the network is removed, even if it comes back', async () => {
        run(timedEngine('cosmos', 2400, [100, 100]))
        const tryStart = vi.fn((claim: ClaimLayout) =>
          run(syncEngine('auto', [1, 1]), claim),
        )
        const onNetworkRemoved = vi.fn()
        runLayoutWhenIdle(tryStart, {
          networkId: 'watched',
          onNetworkRemoved,
        })

        useNetworkStore.getState().delete('watched')
        addNetwork()
        vi.advanceTimersByTime(2400)
        await flushMicrotasks()

        expect(tryStart).not.toHaveBeenCalled()
        expect(onNetworkRemoved).toHaveBeenCalledTimes(1)
        // Nothing is left waiting, so the slot is free for anyone
        expect(run(syncEngine('later', [2, 2]))).toBe(true)
      })

      it('starts as usual while the network stays', async () => {
        run(timedEngine('cosmos', 2400, [100, 100]))
        const onNetworkRemoved = vi.fn()
        runLayoutWhenIdle((claim) => run(syncEngine('auto', [1, 1]), claim), {
          networkId: 'watched',
          onNetworkRemoved,
        })

        vi.advanceTimersByTime(2400)
        await flushMicrotasks()
        useNetworkStore.getState().delete('watched')

        expect(undoEntries).toEqual([
          'Apply cosmos layout',
          'Apply auto layout',
        ])
        expect(onNetworkRemoved).not.toHaveBeenCalled()
      })
    })
  })
})
