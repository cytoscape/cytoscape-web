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
}

export type LayoutStoreModel = LayoutState & LayoutAction
