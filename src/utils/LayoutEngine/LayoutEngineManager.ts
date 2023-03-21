import { LayoutEngine } from './LayoutEngine'

export interface LayoutEngineManager {
  layoutEngines: LayoutEngine[]
  getLayoutEngine: (name: string) => LayoutEngine
}
