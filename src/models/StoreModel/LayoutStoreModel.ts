import { LayoutAlgorithm, LayoutEngine } from '../LayoutModel'
import { ValueType } from '../TableModel'

export interface LayoutState {
  layoutEngines: LayoutEngine[]
  preferredLayout: LayoutAlgorithm
  preferredHierarchicalLayout: LayoutAlgorithm
  isRunning: boolean
}

export interface LayoutAction {
  setLayoutOption: <T extends ValueType>(
    engineName: string,
    algorithmName: string,
    propertyName: string,
    propertyValue: T,
  ) => void
  setPreferredLayout: (engineName: string, algorithmName: string) => void
  setIsRunning: (isRunning: boolean) => void

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
