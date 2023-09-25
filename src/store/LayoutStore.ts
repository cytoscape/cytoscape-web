import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { LayoutEngine } from '../models/LayoutModel/LayoutEngine'
import { LayoutAlgorithm } from '../models/LayoutModel/LayoutAlgorithm'
import { ValueType } from '../models/TableModel'
import { G6Layout } from '../models/LayoutModel/impl/G6/G6Layout'
import { CyjsLayout } from '../models/LayoutModel/impl/Cyjs/CyjsLayout'
import { CosmosLayout } from '../models/LayoutModel/impl/Cosmos/CosmosLayout'
import { Property } from '../models/PropertyModel/Property'

const LayoutEngines: LayoutEngine[] = [G6Layout, CyjsLayout, CosmosLayout]
const defAlgorithm: LayoutAlgorithm = G6Layout.algorithms.gForce
const defHierarchicalAlgorithm: LayoutAlgorithm =
  G6Layout.algorithms.hierarchical

/**
 * Store for layout parameters
 */
interface LayoutState {
  layoutEngines: LayoutEngine[]
  preferredLayout: LayoutAlgorithm
  preferredHierarchicalLayout: LayoutAlgorithm
  isRunning: boolean
}

interface LayoutAction {
  setLayoutOption: <T extends ValueType>(
    engineName: string,
    algorithmName: string,
    propertyName: string,
    propertyValue: T,
  ) => void
  setPreferredLayout: (engineName: string, algorithmName: string) => void
  setIsRunning: (isRunning: boolean) => void
}

const getLayout = (
  engineName: string,
  algorithmName: string,
): LayoutAlgorithm | undefined => {
  const engine: LayoutEngine | undefined = LayoutEngines.find(
    (engine: { name: string }) => engine.name === engineName,
  )

  if (engine === undefined) {
    return
  }

  const algorithm: LayoutAlgorithm = engine.algorithms[algorithmName]

  if (algorithm === undefined) {
    return
  }

  return algorithm
}

export const useLayoutStore = create(
  immer<LayoutState & LayoutAction>((set) => ({
    layoutEngines: LayoutEngines,
    preferredLayout: defAlgorithm,
    preferredHierarchicalLayout: defHierarchicalAlgorithm,
    isRunning: false,

    setPreferredLayout(engineName: string, algorithmName: string) {
      set((state) => {
        const algorithm: LayoutAlgorithm | undefined = getLayout(
          engineName,
          algorithmName,
        )
        if (algorithm !== undefined) {
          state.preferredLayout = algorithm
        }
      })
    },
    setIsRunning(isRunning: boolean) {
      set((state) => {
        state.isRunning = isRunning
      })
    },

    setLayoutOption<T extends ValueType>(
      engineName: string,
      algorithmName: string,
      propertyName: string,
      propertyValue: T,
    ) {
      set((state) => {
        const engines = state.layoutEngines
        const engine: LayoutEngine | undefined = engines.find(
          (engine: { name: string }) => engine.name === engineName,
        )

        if (engine === undefined) {
          return
        }

        const algorithm = engine.algorithms[algorithmName]

        if (algorithm === undefined) {
          return
        }

        const { parameters } = algorithm
        const prop: any = parameters[propertyName]

        if (prop === undefined) {
          return
        }

        const { editables } = algorithm

        // Check actual parameter name.
        // This should exists before setting the value in editableParameters

        if (editables === undefined) {
          return
        }
        const targetProp = editables[propertyName]

        if (targetProp === undefined) {
          return
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
        engine.algorithms = {
          ...engine.algorithms,
          [algorithmName]: newAlgorithm,
        }
      })
    },
  })),
)
