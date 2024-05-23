import { VisualStyle } from '../../../../models/VisualStyleModel'
import { createVisualStyle } from '../../../../models/VisualStyleModel/impl/VisualStyleFnImpl'

const DEF_VS: VisualStyle = createVisualStyle()
const { edgeLineColor, nodeBorderColor, nodeBackgroundColor } = DEF_VS

export const CompatibleVisualProperties = {
  [edgeLineColor.name]: edgeLineColor.name,
  [nodeBorderColor.name]: nodeBorderColor.name,
  [nodeBackgroundColor.name]: nodeBackgroundColor.name,
} as const

export type CompatibleVisualProperties = typeof CompatibleVisualProperties
