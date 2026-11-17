import { useLayoutStore } from './LayoutStore'

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
 * that claims the run with `LayoutStore.startLayout`) and returns whether it
 * started. It is called at once when the flag is down; otherwise, and again
 * whenever another waiter took the slot first, each time the flag comes down.
 * It is never called again once it has returned true, even when the layout
 * finishes synchronously inside the call and lowers the flag.
 *
 * After waiting, the start comes one microtask after the flag drops, not
 * inside the store notification. The finishing layout lowers the flag from
 * its own completion callback; starting there would run the next layout
 * nested in that callback, before the callback's remaining work (the App
 * API's `layout:completed`, a fit), and a queue of synchronous layouts would
 * nest one call stack per layout. A microtask still runs before any user
 * event, so waiting layouts keep their turn ahead of a click. Waiters start
 * in the order they began waiting.
 *
 * @returns a function that stops waiting; a no-op once the layout started
 */
export const runLayoutWhenIdle = (tryStart: () => boolean): (() => void) => {
  let done = false
  let starting = false
  let scheduled = false
  let unsubscribe: (() => void) | undefined

  const attempt = (): void => {
    // Read the live flag, not a listener argument: zustand hands every
    // listener the state of the change that notified it, which is stale when
    // an earlier listener has just started another layout.
    if (done || starting || useLayoutStore.getState().isRunning) {
      return
    }
    starting = true
    try {
      done = tryStart()
    } finally {
      starting = false
    }
    if (done) {
      unsubscribe?.()
    }
  }

  attempt()
  if (done) {
    return () => {}
  }
  unsubscribe = useLayoutStore.subscribe(() => {
    if (done || scheduled || useLayoutStore.getState().isRunning) {
      return
    }
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      attempt()
    })
  })
  return () => {
    done = true
    unsubscribe?.()
  }
}
