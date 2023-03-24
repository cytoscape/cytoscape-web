import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { LayoutEngine } from '../models/LayoutModel/LayoutEngine'
import { LayoutAlgorithm } from '../models/LayoutModel/LayoutAlgorithm'
import { ValueType } from '../models/TableModel'
import { G6Layout } from '../models/LayoutModel/impl/G6/G6Layout'
import { CyjsLayout } from '../models/LayoutModel/impl/Cyjs/CyjsLayout'
import { Property } from '../models/PropertyModel/Property'

const DefaultLayoutEngines: LayoutEngine[] = [G6Layout, CyjsLayout]

/**
 * Store for layout parameters
 */
interface LayoutState {
  readonly layoutEngines: LayoutEngine[]
}

interface LayoutAction {
  setLayoutOption: <T extends ValueType>(
    engineName: string,
    algorithmName: string,
    propertyName: string,
    propertyValue: T,
  ) => void
}

export const useLayoutStore = create(
  immer<LayoutState & LayoutAction>((set) => ({
    layoutEngines: DefaultLayoutEngines,

    setLayoutOption<T extends ValueType>(
      engineName: string,
      algorithmName: string,
      propertyName: string,
      propertyValue: T,
    ) {
      set((state) => {
        const engine: LayoutEngine | undefined = state.layoutEngines.find(
          (engine: { name: string }) => engine.name === engineName,
        )

        if (engine === undefined) {
          return
        }

        const algorithm: LayoutAlgorithm = engine.getAlgorithm(algorithmName)

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
