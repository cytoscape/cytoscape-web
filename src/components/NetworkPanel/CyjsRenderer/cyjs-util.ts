/**
 * cyjs-util.ts
 *
 * Utility functions and mappings for integrating Cytoscape.js with the application's
 * visual style and view model system. This module provides:
 *   - Handlers for mapping application visual properties to Cytoscape.js data fields.
 *   - Functions to generate Cytoscape.js style objects from the application's visual style model.
 *   - Functions to apply view model data to Cytoscape.js elements.
 *
 * The main entry points are:
 *   - createCyjsDataMapper: Generates Cytoscape.js style mappings from a VisualStyle.
 *   - applyViewModel: Applies the current view model to Cytoscape.js elements.
 */

import { Collection, Core, SingularElementArgument } from 'cytoscape'
import { IdType } from '../../../models/IdType'
import { EdgeView, NetworkView, NodeView } from '../../../models/ViewModel'
import { View } from '../../../models/ViewModel/View'
import VisualStyleFn, {
  EdgeArrowShapeType,
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
  VisualProperty,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
  NodeShapeType,
} from '../../../models/VisualStyleModel'
import { CyjsDirectMapper } from '../../../models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/CyjsDirectMapper'
import { getCyjsVpName } from '../../../models/VisualStyleModel/impl/cyJsVisualPropertyConverter'
import { SpecialPropertyName } from '../../../models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/DirectMappingSelector'
import { CyjsVisualPropertyName } from '../../../models/VisualStyleModel/impl/CyjsProperties/CyjsVisualPropertyName'
import { VisualEditorProperties } from '../../../models/VisualStyleModel/VisualStyleOptions'
import { computeNodeLabelPosition } from '../../../models/VisualStyleModel/impl/nodeLabelPositionMap'
import { NodeShapeMapping } from './cyjs-factory'
import {
  getFirstValidCustomGraphicVp,
  getNonCustomGraphicVps,
} from '../../../models/VisualStyleModel/impl/CustomGraphicsImpl'

/**
 * Helper to update edge arrow shape and fill properties on a Cytoscape.js element.
 * Handles special case for 'Arrow' shape, mapping it to 'Triangle' for Cytoscape.js.
 *
 * @param obj - Cytoscape.js element
 * @param key - Visual property name (arrow shape)
 * @param value - Value for the arrow shape
 * @param view - The view model for the element
 * @param arrowFillProperty - The fill property name (source/target)
 */
function updateEdgeArrowShape(
  obj: SingularElementArgument,
  key: VisualPropertyName,
  value: any,
  view: View,
  arrowFillProperty: SpecialPropertyName,
) {
  const arrowFillValue = view.values.get(
    arrowFillProperty as VisualPropertyName,
  )
  obj.data(key, value)
  obj.data(arrowFillProperty, arrowFillValue)
  // Cytoscape.js does not support 'arrow', so map to 'triangle'
  if (obj.data(key) === EdgeArrowShapeType.Arrow) {
    obj.data(key, EdgeArrowShapeType.Triangle)
  }
}

/**
 * Map of visual property handlers for special-case property conversions.
 * Each handler is responsible for mapping a specific visual property from the view model
 * to the appropriate Cytoscape.js data fields.
 */
const vpHandlers = new Map<
  VisualPropertyName,
  (
    obj: SingularElementArgument,
    key: VisualPropertyName,
    value: any,
    view: View,
  ) => void
>()

// Handler for node label position: computes and sets alignment, margin, and justification.
vpHandlers.set(
  VisualPropertyName.NodeLabelPosition,
  (obj, key, value, view) => {
    const { horizontalAlign, verticalAlign } = computeNodeLabelPosition(value)
    obj.data(SpecialPropertyName.NodeLabelHorizontalAlign, horizontalAlign)
    obj.data(SpecialPropertyName.NodeLabelVerticalAlign, verticalAlign)
    obj.data(SpecialPropertyName.NodeLabelMarginX, value.MARGIN_X)
    obj.data(SpecialPropertyName.NodeLabelMarginY, value.MARGIN_Y)
    obj.data(SpecialPropertyName.NodeLabelJustification, value.JUSTIFICATION)
  },
)

// Handler for edge target arrow shape and fill.
vpHandlers.set(
  VisualPropertyName.EdgeTargetArrowShape,
  (obj, key, value, view) => {
    updateEdgeArrowShape(
      obj,
      key,
      value,
      view,
      SpecialPropertyName.TargetArrowFill,
    )
  },
)

// Handler for edge source arrow shape and fill.
vpHandlers.set(
  VisualPropertyName.EdgeSourceArrowShape,
  (obj, key, value, view) => {
    updateEdgeArrowShape(
      obj,
      key,
      value,
      view,
      SpecialPropertyName.SourceArrowFill,
    )
  },
)

// Handler for node shape: maps application node shape to Cytoscape.js node shape.
vpHandlers.set(VisualPropertyName.NodeShape, (obj, key, value, view) => {
  obj.data(key, NodeShapeMapping[value as NodeShapeType])
})

// Handler for node label rotation: converts degrees to radians for Cytoscape.js.
vpHandlers.set(
  VisualPropertyName.NodeLabelRotation,
  (obj, key, value, view) => {
    obj.data(key, (value * Math.PI) / 180)
  },
)

// Handler for edge label rotation: converts degrees to radians for Cytoscape.js.
vpHandlers.set(
  VisualPropertyName.EdgeLabelRotation,
  (obj, key, value, view) => {
    obj.data(key, (value * Math.PI) / 180)
  },
)

/**
 * Generates an array of Cytoscape.js style mappings (CyjsDirectMapper) from the application's VisualStyle.
 * Handles node and edge visual properties, including custom graphics (pie/ring/image), selection, and hover.
 *
 * @param vs - The application's VisualStyle object
 * @returns Array of CyjsDirectMapper objects for Cytoscape.js
 */
export const createCyjsDataMapper = (vs: VisualStyle): CyjsDirectMapper[] => {
  const nodeVps = VisualStyleFn.nodeVisualProperties(vs)
  const edgeVps = VisualStyleFn.edgeVisualProperties(vs)

  const cyStyle: CyjsDirectMapper[] = []

  // Base edge style: ensures arrows and text wrapping are enabled.
  const baseEdgeStyle = {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'text-wrap': 'wrap',
    },
  }

  // Base node style: enables text wrapping.
  const baseNodeStyle = {
    selector: 'node',
    style: {
      'text-wrap': 'wrap',
    },
  }
  cyStyle.push(baseEdgeStyle as CyjsDirectMapper)
  cyStyle.push(baseNodeStyle as CyjsDirectMapper)

  // Add node visual properties (excluding custom graphics).
  const nonCustomGraphicNodeVps = getNonCustomGraphicVps(nodeVps)

  nonCustomGraphicNodeVps.forEach(
    (vp: VisualProperty<VisualPropertyValueType>) => {
      const cyjsVpName = getCyjsVpName(vp.name)
      if (cyjsVpName !== undefined) {
        if (vp.name === VisualPropertyName.NodeSelectedPaint) {
          // Special mapping for selected node color.
          const selectedNodeMapping = {
            selector: 'node:selected',
            style: {
              [cyjsVpName]: `data(${vp.name})`,
            },
          }
          cyStyle.push(selectedNodeMapping as CyjsDirectMapper)
        } else if (vp.name === VisualPropertyName.NodeLabelPosition) {
          // Node label position is mapped to several style properties.
          const valignDirectMapping: CyjsDirectMapper = {
            selector: `node[${SpecialPropertyName.NodeLabelVerticalAlign}]`,
            style: {
              [CyjsVisualPropertyName.LabelVerticalAlign]: `data(${SpecialPropertyName.NodeLabelVerticalAlign})`,
            },
          }

          const halignDirectMapping: CyjsDirectMapper = {
            selector: `node[${SpecialPropertyName.NodeLabelHorizontalAlign}]`,
            style: {
              [CyjsVisualPropertyName.LabelHorizontalAlign]: `data(${SpecialPropertyName.NodeLabelHorizontalAlign})`,
            },
          }

          const marginXDirectMapping: CyjsDirectMapper = {
            selector: `node[${SpecialPropertyName.NodeLabelMarginX}]`,
            style: {
              'text-margin-x': `data(${SpecialPropertyName.NodeLabelMarginX})`,
            },
          }

          const marginYDirectMapping: CyjsDirectMapper = {
            selector: `node[${SpecialPropertyName.NodeLabelMarginY}]`,
            style: {
              'text-margin-y': `data(${SpecialPropertyName.NodeLabelMarginY})`,
            },
          }
          const justificationDirectMapping: CyjsDirectMapper = {
            selector: `node[${SpecialPropertyName.NodeLabelJustification}]`,
            style: {
              'text-justification': `data(${SpecialPropertyName.NodeLabelJustification})`,
            },
          }

          cyStyle.push(valignDirectMapping)
          cyStyle.push(halignDirectMapping)
          cyStyle.push(marginXDirectMapping)
          cyStyle.push(marginYDirectMapping)
          cyStyle.push(justificationDirectMapping)
        } else {
          // Default direct mapping for node visual properties.
          const directMapping: CyjsDirectMapper = {
            selector: `node[${vp.name}]`,
            style: {
              [cyjsVpName]: `data(${vp.name})`,
            },
          }
          cyStyle.push(directMapping)
        }
      }
    },
  )

  // Handle custom graphics (pie/ring/image) if present in the node visual properties.
  // Only default values and bypasses are supported for now.
  const firstValidCustomGraphicVp = getFirstValidCustomGraphicVp(nodeVps)

  if (firstValidCustomGraphicVp !== undefined) {
    // Add all custom graphics properties for pie, ring, and image.
    // This ensures that any node can use any custom graphic in its style or bypass.
    /**
     * Adds Cytoscape.js pie chart style properties for up to 16 slices.
     */
    const addCyjsPieProperties = () => {
      const MAX_SLICES = 16 // Allocate all 16 slices for flexibility.
      const pieSizeStyleName = 'pie-size'
      const pieSizeSelectorStr = 'pieSize'
      const pieSizeMapping = {
        selector: `node[${pieSizeSelectorStr}]`,
        style: {
          [pieSizeStyleName]: `data(${pieSizeSelectorStr})`,
        },
      }

      const pieStartAngleStyleName = 'pie-start-angle'
      const pieStartAngleSelectorStr = 'pieStartAngle'
      const pieStartAngleMapping = {
        selector: `node[${pieStartAngleSelectorStr}]`,
        style: {
          [pieStartAngleStyleName]: `data(${pieStartAngleSelectorStr})`,
        },
      }

      const pieBackGroundMappings = []
      for (let i = 1; i <= MAX_SLICES; i++) {
        const bgColorStyleName = `pie-${i}-background-color`
        const bgColorSelectorStr = `pie${i}BackgroundColor`
        const pieBackgroundColorMapping = {
          selector: `node[${bgColorSelectorStr}]`,
          style: {
            [bgColorStyleName]: `data(${bgColorSelectorStr})`,
          },
        }

        const pieSliceSizeStyleName = `pie-${i}-background-size`
        const pieSliceSizeSelectorStr = `pie${i}BackgroundSize`
        const pieSliceSizeMapping = {
          selector: `node[${pieSliceSizeSelectorStr}]`,
          style: {
            [pieSliceSizeStyleName]: `data(${pieSliceSizeSelectorStr})`,
          },
        }

        pieBackGroundMappings.push(pieBackgroundColorMapping)
        pieBackGroundMappings.push(pieSliceSizeMapping)
      }

      cyStyle.push(pieSizeMapping as CyjsDirectMapper)
      cyStyle.push(pieStartAngleMapping as CyjsDirectMapper)

      pieBackGroundMappings.forEach((mapping) => {
        cyStyle.push(mapping as CyjsDirectMapper)
      })
    }

    /**
     * Adds Cytoscape.js ring chart (pie hole) style property.
     */
    const addCyjsRingProperties = () => {
      const pieHoleSizeStyleName = 'pie-hole'
      const pieHoleSizeSelectorStr = 'pieHole'
      const pieHoleSizeMapping = {
        selector: `node[${pieHoleSizeSelectorStr}]`,
        style: {
          [pieHoleSizeStyleName]: `data(${pieHoleSizeSelectorStr})`,
        },
      }
      cyStyle.push(pieHoleSizeMapping as CyjsDirectMapper)
    }

    /**
     * Placeholder for image custom graphics properties.
     * (Not implemented yet.)
     */
    const addCyjsImageProperties = () => {}

    addCyjsPieProperties()
    addCyjsRingProperties()
    addCyjsImageProperties()
  }

  /**
   * Create edge style model.
   * The order of edge style mappings is important: higher priority elements (e.g. selection)
   * should be added last.
   */
  let edgeSelectedPaintMapping = {}
  edgeVps.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
    const cyjsVpName = getCyjsVpName(vp.name)
    if (cyjsVpName !== undefined) {
      // Special case: selection is a special state in Cytoscape.js and
      // irregular handling is required
      if (vp.name === 'edgeSelectedPaint') {
        edgeSelectedPaintMapping = {
          selector: 'edge:selected',
          style: {
            [cyjsVpName]: `data(${vp.name})`,
          },
        }
      } else if (
        vp.name === VisualPropertyName.EdgeSourceArrowShape ||
        vp.name === VisualPropertyName.EdgeTargetArrowShape
      ) {
        // Edge arrow shape and fill require two mappings each.
        const edgeArrowShapeMapping: CyjsDirectMapper = {
          selector: `edge[${vp.name}]`,
          style: {
            [cyjsVpName]: `data(${vp.name})`,
          },
        }
        const edgePos =
          vp.name === VisualPropertyName.EdgeSourceArrowShape
            ? 'source'
            : 'target'
        const edgePosFillSelector =
          vp.name === VisualPropertyName.EdgeSourceArrowShape
            ? SpecialPropertyName.SourceArrowFill
            : SpecialPropertyName.TargetArrowFill
        const edgeArrowFillMapping: CyjsDirectMapper = {
          selector: `edge[${edgePosFillSelector}]`,
          style: {
            [`${edgePos}-arrow-fill`]: `data(${edgePosFillSelector})`,
          },
        }
        cyStyle.push(edgeArrowFillMapping)
        cyStyle.push(edgeArrowShapeMapping)
      } else {
        // Default direct mapping for edge visual properties.
        const directMapping: CyjsDirectMapper = {
          selector: `edge[${vp.name}]`,
          style: {
            [cyjsVpName]: `data(${vp.name})`,
          },
        }
        cyStyle.push(directMapping)
      }
    }
  })

  // Edge selection color should be the last element in the style
  cyStyle.push(edgeSelectedPaintMapping as CyjsDirectMapper)

  // Add a special class for mouse hover highlighting.
  // This is not part of the current style object, but is defined here for convenience.
  // TODO: Define a proper type for this mapping.
  const hoverMapping: any = {
    selector: `.hover`,
    style: {
      'underlay-color': 'lightblue',
      'underlay-padding': 10,
      'underlay-opacity': 0.6,
      'underlay-shape': 'roundrectangle',
    },
  }
  cyStyle.push(hoverMapping as CyjsDirectMapper)

  return cyStyle
}

/**
 * Updates Cytoscape.js elements with data from the application's view model.
 * Handles special-case property handlers and visual editor property overrides.
 *
 * @param views - Map of element IDs to view models
 * @param cyObjects - Cytoscape.js collection of elements (nodes or edges)
 * @param visualEditorProperties - Visual editor options
 */
const updateCyElements = <T extends View>(
  views: Record<IdType, T>,
  cyObjects: Collection<SingularElementArgument>,
  visualEditorProperties: VisualEditorProperties,
): void => {
  cyObjects.forEach((obj: SingularElementArgument) => {
    const cyId = obj.data('id')

    const view: View = views[cyId]
    if (view !== undefined) {
      view.values.forEach((value, key) => {
        const vpHandler = vpHandlers.get(key)
        if (vpHandler) {
          vpHandler(obj, key, value, view)
        } else {
          obj.data(key, value)
        }
      })

      // If node size is locked, set width equal to height.
      if (visualEditorProperties?.nodeSizeLocked) {
        obj.data(
          NodeVisualPropertyName.NodeWidth,
          obj.data(NodeVisualPropertyName.NodeHeight),
        )
      }
      // If arrow color should match edge color, set arrow colors to edge line color.
      if (visualEditorProperties?.arrowColorMatchesEdge) {
        const color = obj.data(EdgeVisualPropertyName.EdgeLineColor)
        obj.data(EdgeVisualPropertyName.EdgeSourceArrowColor, color)
        obj.data(EdgeVisualPropertyName.EdgeTargetArrowColor, color)
      }
    }
  })
}

/**
 * Applies the current view model (node and edge views) to the Cytoscape.js instance.
 * This updates Cytoscape.js element data fields to match the application's view model,
 * including any visual editor property overrides.
 *
 * @param cy - Cytoscape.js core instance
 * @param networkView - The application's network view (nodeViews, edgeViews)
 * @param visualEditorProperties - Visual editor options (e.g. node size lock)
 */
export const applyViewModel = (
  cy: Core,
  networkView: NetworkView,
  visualEditorProperties: VisualEditorProperties,
): void => {
  const { nodeViews, edgeViews } = networkView
  updateCyElements<NodeView>(nodeViews, cy.nodes(), visualEditorProperties)
  updateCyElements<EdgeView>(edgeViews, cy.edges(), visualEditorProperties)
}
