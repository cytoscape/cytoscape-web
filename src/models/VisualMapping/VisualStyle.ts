import { VisualProperty } from "../NetworkView/VisualProperty"
import { VisualMappingFucntion } from "./VisualMappingFunction"

export interface VisualStyle {
  name: string
  defaults: VisualProperty<any>[]
  mappings: VisualMappingFucntion<any, any>[]
}