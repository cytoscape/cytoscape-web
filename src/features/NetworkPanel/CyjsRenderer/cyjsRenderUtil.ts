/**
 * cyjs-util.ts
 *
 * Utility functions and mappings for integrating Cytoscape.js with the application's
 * visual style and view model system. This module provides:
 *   - Transforms from application visual property values to Cytoscape.js values.
 *   - Functions to generate Cytoscape.js style objects from the application's visual style model.
 *   - A function to update the data of elements on screen.
 *
 * The main entry points are:
 *   - createCyjsDataMapper: Generates Cytoscape.js style mappings from a VisualStyle.
 *   - applyCyElementData: Updates the data of the elements on screen.
 */

import { Core, ElementDefinition } from 'cytoscape'

import VisualStyleFn, {
  NodeShapeType,
  VisualProperty,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
} from '../../../models/VisualStyleModel'
import {
  getFirstValidCustomGraphicVp,
  getNonCustomGraphicVps,
  getPieBackgroundColorViewModelProp,
  getPieBackgroundSizeViewModelProp,
  VALID_PIE_CHART_SLICE_INDEX_RANGE,
} from '../../../models/VisualStyleModel/impl/customGraphicsImpl'
import { CyjsDirectMapper } from '../../../models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/cyjsDirectMapper'
import { SpecialPropertyName } from '../../../models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/directMappingSelector'
import {
  CyjsVisualPropertyName,
  CyjsVisualPropertyType,
} from '../../../models/VisualStyleModel/impl/CyjsProperties/cyjsVisualPropertyName'
import {
  getCyjsVpName,
  getPieBackgroundColorCyJsProp,
  getPieBackgroundSizeCyJsProp,
} from '../../../models/VisualStyleModel/impl/cyJsVisualPropertyConverter'

/**
 * Maps application node shape types to Cytoscape.js node shape strings.
 */
export const NodeShapeMapping: Record<NodeShapeType, string> = {
  [NodeShapeType.Parallelogram]: 'rhomboid',
  [NodeShapeType.RoundRectangle]: 'roundrectangle',
  [NodeShapeType.Triangle]: 'triangle',
  [NodeShapeType.Diamond]: 'diamond',
  [NodeShapeType.Octagon]: 'octagon',
  [NodeShapeType.Hexagon]: 'hexagon',
  [NodeShapeType.Ellipse]: 'ellipse',
  [NodeShapeType.Rectangle]: 'rectangle',
  [NodeShapeType.Vee]: 'vee',
}

/**
 * Transforms a node shape value from application format to Cytoscape.js format.
 */
export const transformNodeShape = (value: NodeShapeType): string => {
  return NodeShapeMapping[value]
}

/**
 * Transforms a rotation value from degrees to radians for Cytoscape.js.
 */
export const transformRotation = (degrees: number): number => {
  return (degrees * Math.PI) / 180
}

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
      const pieSizeStyleName = 'pie-size' as CyjsVisualPropertyType
      const pieSizeSelectorStr = SpecialPropertyName.PieSize
      const pieSizeMapping = {
        selector: `node[${pieSizeSelectorStr}]`,
        style: {
          [pieSizeStyleName]: `data(${pieSizeSelectorStr})`,
        },
      }

      const pieStartAngleStyleName = 'pie-start-angle' as CyjsVisualPropertyType
      const pieStartAngleSelectorStr = SpecialPropertyName.PieStartAngle
      const pieStartAngleMapping = {
        selector: `node[${pieStartAngleSelectorStr}]`,
        style: {
          [pieStartAngleStyleName]: `data(${pieStartAngleSelectorStr})`,
        },
      }

      const pieBackGroundMappings = []
      for (
        let i = VALID_PIE_CHART_SLICE_INDEX_RANGE[0];
        i <= VALID_PIE_CHART_SLICE_INDEX_RANGE[1];
        i++
      ) {
        const bgColorStyleName = getPieBackgroundColorCyJsProp(i)
        const bgColorSelectorStr = getPieBackgroundColorViewModelProp(i)
        const pieBackgroundColorMapping = {
          selector: `node[${bgColorSelectorStr}]`,
          style: {
            [bgColorStyleName]: `data(${bgColorSelectorStr})`,
          },
        }

        const pieSliceSizeStyleName = getPieBackgroundSizeCyJsProp(i)
        const pieSliceSizeSelectorStr = getPieBackgroundSizeViewModelProp(i)
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
      const pieHoleSizeStyleName = 'pie-hole' as CyjsVisualPropertyType
      const pieHoleSizeSelectorStr = SpecialPropertyName.PieHole
      const pieHoleSizeMapping = {
        selector: `node[${pieHoleSizeSelectorStr}]`,
        style: {
          [pieHoleSizeStyleName]: `data(${pieHoleSizeSelectorStr})`,
        },
      }
      cyStyle.push(pieHoleSizeMapping as CyjsDirectMapper)
    }

    /**
     * Adds Cytoscape.js image custom graphics properties.
     */
    const addCyjsImageProperties = () => {
      const imageProps: Array<{
        selectorStr: SpecialPropertyName
        styleStr: string
      }> = [
        {
          selectorStr: SpecialPropertyName.BackgroundImage,
          styleStr: 'background-image',
        },
        {
          selectorStr: SpecialPropertyName.BackgroundFit,
          styleStr: 'background-fit',
        },
        {
          selectorStr: SpecialPropertyName.BackgroundImageCrossorigin,
          styleStr: 'background-image-crossorigin',
        },
      ]

      imageProps.forEach(({ selectorStr, styleStr }) => {
        const mapping = {
          selector: `node[${selectorStr}]`,
          style: {
            [styleStr as CyjsVisualPropertyType]: `data(${selectorStr})`,
          },
        }
        cyStyle.push(mapping as CyjsDirectMapper)
      })
    }

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

  // Add a special class for edge creation target highlighting.
  const edgeCreationTargetMapping: any = {
    selector: `.edge-creation-target`,
    style: {
      'underlay-color': 'lightgreen',
      'underlay-padding': 10,
      'underlay-opacity': 0.5,
      'underlay-shape': 'roundrectangle',
    },
  }
  cyStyle.push(edgeCreationTargetMapping as CyjsDirectMapper)

  return cyStyle
}

/** Data keys Cytoscape.js fixes when an element is created. */
const FIXED_DATA_KEYS = new Set(['id', 'source', 'target', 'parent'])

/**
 * Give the elements on screen the data of `definitions` (createCyElements in
 * cyjsFactoryUtil.ts): set every key they carry and remove every other key,
 * such as a custom graphic the view no longer has, or a value that moved
 * into the stylesheet's base `node` / `edge` rule.
 *
 * Elements without a definition, and definitions without an element, are
 * left alone. Call inside cy.startBatch() / cy.endBatch().
 */
export const applyCyElementData = (
  cy: Core,
  definitions: ElementDefinition[],
): void => {
  definitions.forEach(({ data }) => {
    const ele = cy.getElementById(data.id as string)
    if (ele.empty()) return
    const stale = Object.keys(ele.data()).filter(
      (key) => !FIXED_DATA_KEYS.has(key) && !(key in data),
    )
    if (stale.length > 0) ele.removeData(stale.join(' '))
    const values: Record<string, unknown> = {}
    Object.keys(data).forEach((key) => {
      if (!FIXED_DATA_KEYS.has(key)) values[key] = data[key]
    })
    ele.data(values)
  })
}
