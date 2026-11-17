import { IdType } from '../IdType'
import { LayoutAlgorithm, LayoutEngine } from '../LayoutModel'
import { ValueType } from '../TableModel'

export interface LayoutState {
  layoutEngines: LayoutEngine[]
  preferredLayout: LayoutAlgorithm
  preferredHierarchicalLayout: LayoutAlgorithm
  isRunning: boolean
  /** The network the running layout is for, when its caller named one. */
  runningNetworkId: IdType | undefined
}

export interface LayoutAction {
  setLayoutOption: <T extends ValueType>(
    engineName: string,
    algorithmName: string,
    propertyName: string,
    propertyValue: T,
  ) => void
  setPreferredLayout: (engineName: string, algorithmName: string) => void
  /**
   * Claim the single layout run for `networkId` (#982): raises the running
   * flag and returns true when no layout runs, and returns false, changing
   * nothing, when one already does. Only one layout runs at a time, so every
   * layout start goes through this check-and-set; the run's owner lowers the
   * flag with `setIsRunning(false)` when it finishes or fails.
   */
  startLayout: (networkId: IdType) => boolean
  /**
   * Raise or lower the running flag. Pass the network being laid out when
   * raising it, so "Applying layout..." shows on that network's view (#979).
   * Raising it here skips the one-layout-at-a-time check; start a layout
   * with `startLayout` instead.
   */
  setIsRunning: (isRunning: boolean, networkId?: IdType) => void

  // App-registered algorithms ('layout-algorithm' resources). Each app owns
  // one synthetic engine named after its id; see layoutStoreImpl.
  upsertAppAlgorithm: (
    appId: string,
    algorithm: LayoutAlgorithm,
    apply: LayoutEngine['apply'],
  ) => void
  removeAppAlgorithm: (appId: string, algorithmName: string) => void
  removeAppEngine: (appId: string) => void
}

export type LayoutStore = LayoutState & LayoutAction
