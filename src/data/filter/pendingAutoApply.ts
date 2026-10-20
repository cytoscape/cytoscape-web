import type { IdType } from '../../models/IdType'

/**
 * The FILTER tab's pending "Apply when filter changes" run, per network.
 *
 * An edit schedules a run a moment later, so typing applies once. A run
 * still pending when the network's visibility or the filter is changed
 * another way would apply the filter over that change, so whatever applies
 * the filter at once (Apply, the select / show radio) or shows every element
 * (Select > Show All) cancels it. It lives here rather than in the tab so
 * that commands with no React can cancel it.
 */

const pending = new Map<IdType, ReturnType<typeof setTimeout>>()

/**
 * Run `run` after `delayMs`, replacing the network's pending run, if any
 */
export const scheduleAutoApply = (
  networkId: IdType,
  run: () => void,
  delayMs: number,
): void => {
  cancelAutoApply(networkId)
  pending.set(
    networkId,
    setTimeout(() => {
      pending.delete(networkId)
      run()
    }, delayMs),
  )
}

/**
 * Drop the network's pending run, if any
 */
export const cancelAutoApply = (networkId: IdType): void => {
  const timer = pending.get(networkId)
  if (timer === undefined) return
  clearTimeout(timer)
  pending.delete(networkId)
}

/**
 * Whether a run is pending for the network
 */
export const hasPendingAutoApply = (networkId: IdType): boolean =>
  pending.has(networkId)
