import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { LayoutEngine } from '../models/LayoutModel/LayoutEngine'
import { LayoutAlgorithm } from '../models/LayoutModel/LayoutAlgorithm'
import { ValueType } from '../models/TableModel'
import { G6Layout } from '../models/LayoutModel/impl/G6/G6Layout'
import { CyjsLayout } from '../models/LayoutModel/impl/Cyjs/CyjsLayout'
import { Property } from '../models/PropertyModel/Property'
import { CosmosLayout } from '../models/LayoutModel/impl/Cosmos/CosmosLayout'

const LayoutEngines: LayoutEngine[] = [G6Layout, CyjsLayout, CosmosLayout]

const defAlgorithm: LayoutAlgorithm = G6Layout.getAlgorithm('gForce')

// const defEngine: LayoutEngine = G6Layout
// const defAlgorithmName: string = G6Layout.defaultAlgorithmName
// const defaultLayoutAlgorithm: LayoutAlgorithm =
//   G6Layout.getAlgorithm(defAlgorithmName)

/**
 * Store for layout parameters
 */
interface LayoutState {
  readonly layoutEngines: LayoutEngine[]
  preferredLayout: LayoutAlgorithm
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

  const algorithm: LayoutAlgorithm = engine.getAlgorithm(algorithmName)

  if (algorithm === undefined) {
    return
  }

  return algorithm
}

export const useLayoutStore = create(
  immer<LayoutState & LayoutAction>((set) => ({
    layoutEngines: LayoutEngines,
    preferredLayout: defAlgorithm,
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
    setIsRunning(isRunning) {
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
        const algorithm: LayoutAlgorithm | undefined = getLayout(
          engineName,
          algorithmName,
        )
        if (algorithm === undefined) {
          return
        }

        const { parameters } = algorithm
        const prop: any = parameters[propertyName]

        if (prop === undefined) {
          return
        }

        let { editables } = algorithm

        // Check actual parameter name.
        // This should exists before setting the value in editableParameters

        if (editables === undefined) {
          editables = []
        }

        const curProp: Property<ValueType> | undefined = editables.find(
          (editable) => editable.name === propertyName,
        )

        if (curProp !== undefined) {
          curProp.value = propertyValue
          prop[propertyName] = propertyValue
        }
      })
    },
  })),
)
