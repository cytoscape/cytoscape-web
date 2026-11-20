import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import type { Network } from '../../../models/NetworkModel'
import { useLayoutStore } from './LayoutStore'
import { useNetworkStore } from './NetworkStore'
import { useNetworkSummaryStore } from './NetworkSummaryStore'

/**
 * Claims the layout run for a network. `runLayoutWhenIdle` hands one to
 * `tryStart`, which must start its layout with it (as `runEngineLayout`'s
 * `startLayout`): the store's own `startLayout` refuses while layouts wait,
 * the waiting one included.
 */
export type ClaimLayout = (networkId: IdType) => boolean

export interface RunLayoutWhenIdleOptions {
  /**
   * Stop waiting when this network leaves the NetworkStore, even when a
   * network with the same id is added again before the slot frees: the
   * waiting job belongs to the network that was removed.
   */
  readonly networkId?: IdType
  /** Called when the wait stops because `networkId` was removed. */
  readonly onNetworkRemoved?: () => void
}

interface Waiter {
  readonly tryStart: (claim: ClaimLayout) => boolean
  readonly networkId?: IdType
  readonly onReplacement?: (hasLayout: boolean) => void
  readonly onSkipped?: () => void
  stopWatching?: () => void
}

// One queue for the whole app: the layout slot is global (#982).
const queue: Waiter[] = []
let unsubscribeLayoutStore: (() => void) | undefined
let drainScheduled = false

const isRunning = (): boolean => useLayoutStore.getState().isRunning

const claimFromQueue: ClaimLayout = (networkId) =>
  useLayoutStore.getState().startLayout(networkId, { fromQueue: true })

const remove = (waiter: Waiter): void => {
  const index = queue.indexOf(waiter)
  if (index === -1) {
    return
  }
  queue.splice(index, 1)
  waiter.stopWatching?.()
  if (queue.length === 0) {
    unsubscribeLayoutStore?.()
    unsubscribeLayoutStore = undefined
    useLayoutStore.getState().setLayoutQueued(false)
  }
}

const scheduleDrain = (): void => {
  if (drainScheduled) {
    return
  }
  drainScheduled = true
  queueMicrotask(drain)
}

// A subnetwork can be replaced without having a summary to record whether
// the replacement supplied positions. Keep that information until its turn.
export const notifyLayoutOfNetworkReplacement = (
  networkId: IdType,
  hasLayout: boolean,
): void => {
  for (const waiter of queue) {
    if (waiter.networkId === networkId) {
      waiter.onReplacement?.(hasLayout)
    }
  }
}

/** Start the head of the queue, if the slot is free. */
const drain = (): void => {
  drainScheduled = false
  const head = queue[0]
  if (head === undefined || isRunning()) {
    return
  }
  let started: boolean
  try {
    started = head.tryStart((networkId) => {
      if (!claimFromQueue(networkId)) {
        return false
      }
      // The slot is held when removing the last waiter notifies subscribers.
      // A synchronous engine can now complete with the queue up to date.
      remove(head)
      return true
    })
  } catch (error) {
    logStore.error(
      '[runLayoutWhenIdle]: A waiting layout threw while starting; it is dropped',
      error,
    )
    started = true
  }
  if (!started && !isRunning()) {
    // The free slot was kept for this layout, so only a tryStart that does
    // not use its claim refuses it. Drop it rather than stall the queue.
    logStore.error(
      '[runLayoutWhenIdle]: A waiting layout did not start on a free slot; it is dropped',
    )
    started = true
  }
  // A skipped or failed job may have finished without claiming the slot.
  if (started && queue[0] === head) {
    remove(head)
  }
  // A layout that finished inside its start, or a job with nothing left to
  // lay out, leaves the slot free for the next one.
  if (queue.length > 0 && !isRunning()) {
    scheduleDrain()
  }
}

/**
 * Start a layout as soon as no other layout runs (#982).
 *
 * Only one layout runs at a time, and a layout the user starts while another
 * runs is refused. An automatic layout cannot be refused that way: the
 * default layout of a network just loaded without positions, or of a Sub
 * Network Viewer network, would leave its nodes unplaced. Such a layout waits
 * here for the running one to finish instead. So does an App API
 * `applyLayout` call made with `waitIfBusy: true`.
 *
 * `tryStart` starts the layout through `runEngineLayout` (or anything else
 * that claims the run) with the `claim` it is given, and returns whether it
 * started (true also when it decided there is nothing to lay out). It is
 * called at once when no layout runs or waits; otherwise it waits in one
 * queue, first come first served, and is called exactly once, on its turn.
 *
 * While layouts wait, the slot a finishing layout frees is kept for them:
 * `LayoutStore.startLayout` refuses every other start until the queue is
 * empty. A turn comes one microtask after the flag drops, not inside the
 * store notification: the finishing layout lowers the flag from its own
 * completion callback, and starting there would run the next layout nested
 * in that callback, before its remaining work (the App API's
 * `layout:completed`, a fit). A microtask still runs before any user event.
 *
 * @returns a function that stops waiting; a no-op once the layout started
 */
export const runLayoutWhenIdle = (
  tryStart: (claim: ClaimLayout) => boolean,
  options: RunLayoutWhenIdleOptions = {},
): (() => void) =>
  scheduleLayout({
    tryStart,
    networkId: options.networkId,
    onSkipped: options.onNetworkRemoved,
  })

/** Run an automatic layout only if the network still needs initial positions. */
export const runInitialLayoutWhenIdle = (
  networkId: IdType,
  start: (network: Network, claim: ClaimLayout) => boolean,
  onSkipped?: () => void,
): (() => void) => {
  let replacementHasLayout = false
  return scheduleLayout({
    networkId,
    onSkipped,
    onReplacement: (hasLayout) => {
      replacementHasLayout = hasLayout
    },
    tryStart: (claim) => {
      const network = useNetworkStore.getState().networks.get(networkId)
      const summary = useNetworkSummaryStore.getState().summaries[networkId]
      if (
        network === undefined ||
        (summary?.hasLayout ?? replacementHasLayout)
      ) {
        onSkipped?.()
        return true
      }
      return start(network, claim)
    },
  })
}

const scheduleLayout = (waiter: Waiter): (() => void) => {
  if (queue.length === 0 && !isRunning() && waiter.tryStart(claimFromQueue)) {
    return () => {}
  }

  queue.push(waiter)
  if (queue.length === 1) {
    useLayoutStore.getState().setLayoutQueued(true)
    // Read the live state, not a listener argument: zustand hands every
    // listener the state of the change that notified it, which is stale when
    // an earlier listener has just started another layout.
    unsubscribeLayoutStore = useLayoutStore.subscribe(() => {
      if (queue.length > 0 && !isRunning()) {
        scheduleDrain()
      }
    })
  }

  const { networkId, onSkipped } = waiter
  if (networkId !== undefined) {
    waiter.stopWatching = useNetworkStore.subscribe((state) => {
      if (!state.networks.has(networkId) && queue.includes(waiter)) {
        remove(waiter)
        onSkipped?.()
      }
    })
  }

  // The slot can be free while layouts wait: between a layout's end and the
  // next turn, or because tryStart refused a free slot above (which only a
  // tryStart that does not use its claim does). The drain takes it from here.
  if (!isRunning()) {
    scheduleDrain()
  }
  return () => remove(waiter)
}
