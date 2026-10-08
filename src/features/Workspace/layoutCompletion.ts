import { IdType } from '../../models/IdType'

/**
 * Side effects the initial-layout completion handler needs.
 *
 * These are supplied by WorkspaceEditor from its stores. Keeping them as
 * injected functions makes the ordering of the effects (which is what the
 * modification-flag correctness depends on) testable in isolation.
 */
export interface LayoutCompletionActions {
  /**
   * Reads the *live* networkModified flag for the network.
   *
   * Must read from the store at call time (not from a React closure), because
   * the flag can be flipped by a user edit while the layout is running.
   */
  isNetworkModified: (networkId: IdType) => boolean

  /** Writes the layout result into the view model. */
  updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void

  /** Fits the viewport so the freshly laid out network is centered. */
  fitViewport: (networkId: IdType) => void

  /** Records in the network summary that the network now has a layout. */
  markLayoutApplied: (networkId: IdType) => void

  /** Toggles the global layout-running indicator. */
  setLayoutRunning: (isRunning: boolean) => void

  /** Sets the networkModified flag. */
  setNetworkModified: (networkId: IdType, isModified: boolean) => void
}

/**
 * Builds the callback invoked when the automatically applied initial layout
 * finishes.
 *
 * The initial layout runs asynchronously, so two things can race:
 *
 * 1. The layout's own position update, which is not a user modification and
 *    must therefore leave the network in an unmodified state.
 * 2. A genuine user edit made while the layout was running, which must survive
 *    layout completion so the unsaved-changes indicator stays visible.
 *
 * Both are reported through the same networkModified flag, so the handler
 * snapshots the flag BEFORE applying its own position update.
 *
 * The snapshot was load-bearing when WorkspaceEditor subscribed to view model
 * changes and flipped the flag synchronously — a read taken after
 * `updateNodePositions` observed the layout's own write and could not tell it
 * from a user edit. That subscription is gone (#680): the flag is now written
 * only by `markNetworkModified`, from `postEdit`, and the initial layout posts
 * no edit. The ordering is kept because it is what makes the handler correct
 * either way, and because a user edit landing DURING the layout still has to
 * survive the clear below.
 *
 * @param networkId ID of the network the layout was run on
 * @param actions Side effects to run on completion
 * @returns Callback accepting the layout's node position map
 */
export const createLayoutCompletionHandler =
  (networkId: IdType, actions: LayoutCompletionActions) =>
  (positionMap: Map<IdType, [number, number]>): void => {
    // Snapshot first: after updateNodePositions below, the flag reflects our own
    // write and no longer tells us whether the user edited the network.
    const modifiedDuringLayout = actions.isNetworkModified(networkId)

    actions.updateNodePositions(networkId, positionMap)
    actions.fitViewport(networkId)
    actions.markLayoutApplied(networkId)
    actions.setLayoutRunning(false)

    // Only clear the flag when no user-initiated change happened while the
    // layout was running. The layout's own position update is not a user edit.
    if (!modifiedDuringLayout) {
      actions.setNetworkModified(networkId, false)
    }
  }
