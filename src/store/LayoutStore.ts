import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { LayoutEngine } from '../models/LayoutModel/LayoutEngine'
import { LayoutAlgorithm } from '../models/LayoutModel/LayoutAlgorithm'
import { ValueType } from '../models/TableModel'
import { G6Layout } from '../models/LayoutModel/impl/G6/G6Layout'
import { CyjsLayout } from '../models/LayoutModel/impl/Cyjs/CyjsLayout'
import { Property } from '../models/PropertyModel/Property'

const LayoutEngines: LayoutEngine[] = [G6Layout, CyjsLayout]

const defEngine: LayoutEngine = G6Layout
const defAlgorithmName: string = G6Layout.defaultAlgorithmName
// const defaultLayoutAlgorithm: LayoutAlgorithm =
//   G6Layout.getAlgorithm(defAlgorithmName)

/**
 * Store for layout parameters
 */
interface LayoutState {
  readonly layoutEngines: LayoutEngine[]
  preferredLayout: [string, string]
}

interface LayoutAction {
  setLayoutOption: <T extends ValueType>(
    engineName: string,
    algorithmName: string,
    propertyName: string,
    propertyValue: T,
  ) => void
  setPreferredLayout: (engineName: string, algorithmName: string) => void
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
    preferredLayout: [defEngine.name, defAlgorithmName],

    setPreferredLayout(engineName: string, algorithmName: string) {
      set((state) => {
        const algorithm: LayoutAlgorithm | undefined = getLayout(
          engineName,
          algorithmName,
        )
        if (algorithm !== undefined) {
          state.preferredLayout = [engineName, algorithmName]
        }
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
