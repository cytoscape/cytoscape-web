import { LayoutEngine } from '../LayoutEngine'
import { LayoutEngineManager } from '../LayoutEngineManager'
import { CyjsLayout } from './Cyjs/CyjsLayout'
import { G6Layout } from './G6/G6Layout'

const DEFAULT_ENGINE: LayoutEngine = CyjsLayout
const LayoutEngines: LayoutEngine[] = [G6Layout, CyjsLayout]

export const LayoutManager: LayoutEngineManager = {
  layoutEngines: LayoutEngines,
  getLayoutEngine: (name: string): LayoutEngine => {
    return (
      LayoutEngines.find((layoutEngine) => layoutEngine.name === name) ??
      DEFAULT_ENGINE
    )
  },
}
