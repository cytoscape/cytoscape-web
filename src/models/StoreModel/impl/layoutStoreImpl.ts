import {
  defAlgorithm,
  defHierarchicalAlgorithm,
  getLayout,
  LayoutEngines,
} from '../../LayoutModel/impl/layoutSelection'
import { LayoutAlgorithm } from '../../LayoutModel/LayoutAlgorithm'
import { LayoutEngine } from '../../LayoutModel/LayoutEngine'
import { Property } from '../../PropertyModel/Property'
import { ValueType } from '../../TableModel'

export interface LayoutState {
  layoutEngines: LayoutEngine[]
  preferredLayout: LayoutAlgorithm
  preferredHierarchicalLayout: LayoutAlgorithm
  isRunning: boolean
}

/**
 * Set preferred layout
 */
export const setPreferredLayout = (
  state: LayoutState,
  engineName: string,
  algorithmName: string,
): LayoutState => {
  const algorithm: LayoutAlgorithm | undefined = getLayout(
    engineName,
    algorithmName,
  )
  if (algorithm === undefined) {
    return state
  }

  return {
    ...state,
    preferredLayout: algorithm,
  }
}

/**
 * Set isRunning flag
 */
export const setIsRunning = (
  state: LayoutState,
  isRunning: boolean,
): LayoutState => {
  return {
    ...state,
    isRunning,
  }
}

/**
 * Set a layout option
 */
export const setLayoutOption = <T extends ValueType>(
  state: LayoutState,
  engineName: string,
  algorithmName: string,
  propertyName: string,
  propertyValue: T,
): LayoutState => {
  const engines = [...state.layoutEngines]
  const engineIndex = engines.findIndex(
    (engine: { name: string }) => engine.name === engineName,
  )

  if (engineIndex === -1) {
    return state
  }

  const engine = engines[engineIndex]
  const algorithm = engine.algorithms[algorithmName]

  if (algorithm === undefined) {
    return state
  }

  const { parameters } = algorithm
  const prop: any = parameters[propertyName]

  if (prop === undefined) {
    return state
  }

  const { editables } = algorithm

  if (editables === undefined) {
    return state
  }

  const targetProp = editables[propertyName]

  if (targetProp === undefined) {
    return state
  }

  const newProp: Property<ValueType> = {
    ...targetProp,
    value: propertyValue,
  }
  const newEditables = { ...editables, [propertyName]: newProp }
  const newParams = { ...parameters, [propertyName]: propertyValue }
  const newAlgorithm = {
    ...algorithm,
    parameters: newParams,
    editables: newEditables,
  }
  const newEngines = [...engines]
  newEngines[engineIndex] = {
    ...engine,
    algorithms: {
      ...engine.algorithms,
      [algorithmName]: newAlgorithm,
    },
  }

  return {
    ...state,
    layoutEngines: newEngines,
  }
}

