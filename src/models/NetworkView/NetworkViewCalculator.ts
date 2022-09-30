import { NetworkView } from '.'
import { VisualStyle } from '../VisualMapping/VisualStyle'
import { Position } from './Position'
import { View } from './View'

/**
 * Apply given visual style to the network view
 *
 * @param view
 * @param style
 */
export const apply = (view: NetworkView, style: VisualStyle): void => {
  const nvs: View[] = view.nodeViews
  const evs: View[] = view.edgeViews

  nvs.forEach((nodeView) => {
    // Compute actual values here
  })
  evs.forEach((edgeView) => {
    // Compute actual values here
  })
}

export const applyLayout = (
  view: NetworkView,
  positions: { key: BigInt; position: Position },
): void => {
  view.nodeViews.forEach((nodeView: View) => {
    // Set position here
  })
}
