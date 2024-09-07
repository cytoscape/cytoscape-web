import { Collection, Core, SingularElementArgument } from 'cytoscape'
import { IdType } from '../../../models/IdType'
import { EdgeView, NetworkView, NodeView } from '../../../models/ViewModel'
import { View } from '../../../models/ViewModel/View'
import VisualStyleFn, {
  EdgeArrowShapeType,
  NodeLabelPositionType,
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

function updateEdgeArrowShape(obj: SingularElementArgument, key: VisualPropertyName, value: any, view: View, arrowFillProperty: SpecialPropertyName) {
  const arrowFillValue = view.values.get(arrowFillProperty as VisualPropertyName);
  obj.data(key, value);
  obj.data(arrowFillProperty, arrowFillValue);
  if (obj.data(key) === EdgeArrowShapeType.Arrow) {
    obj.data(key, EdgeArrowShapeType.Triangle);
  }
}

const vpHandlers = new Map<VisualPropertyName, (obj: SingularElementArgument, key: VisualPropertyName, value: any, view: View) => void>();

vpHandlers.set(VisualPropertyName.NodeLabelPosition, (obj, key, value, view) => {
  const { horizontalAlign, verticalAlign } = computeNodeLabelPosition(value);
  obj.data(SpecialPropertyName.NodeLabelHorizontalAlign, horizontalAlign);
  obj.data(SpecialPropertyName.NodeLabelVerticalAlign, verticalAlign);
  obj.data(SpecialPropertyName.NodeLabelMarginX, value.MARGIN_X);
  obj.data(SpecialPropertyName.NodeLabelMarginY, value.MARGIN_Y);
  obj.data(SpecialPropertyName.NodeLabelJustification, value.JUSTIFICATION);
});

vpHandlers.set(VisualPropertyName.EdgeTargetArrowShape, (obj, key, value, view) => {
  updateEdgeArrowShape(obj, key, value, view, SpecialPropertyName.TargetArrowFill);
});

vpHandlers.set(VisualPropertyName.EdgeSourceArrowShape, (obj, key, value, view) => {
  updateEdgeArrowShape(obj, key, value, view, SpecialPropertyName.SourceArrowFill);
  
});

vpHandlers.set(VisualPropertyName.NodeShape, (obj, key, value, view) => {
  obj.data(key, NodeShapeMapping[value as NodeShapeType]);
});

vpHandlers.set(VisualPropertyName.NodeLabelRotation, (obj, key, value, view) => {
  obj.data(key, (value * Math.PI) / 180);
});

vpHandlers.set(VisualPropertyName.EdgeLabelRotation, (obj, key, value, view) => {
  obj.data(key, (value * Math.PI) / 180);
});


export const createCyjsDataMapper = (vs: VisualStyle): CyjsDirectMapper[] => {
  const nodeVps = VisualStyleFn.nodeVisualProperties(vs)
  const edgeVps = VisualStyleFn.edgeVisualProperties(vs)

  const cyStyle: CyjsDirectMapper[] = []

  // This is for showing arrows.
  const baseEdgeStyle = {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'text-wrap': 'wrap',
    },
  }

  const baseNodeStyle = {
    selector: 'node',
    style: {
      'text-wrap': 'wrap',
    },
  }
  cyStyle.push(baseEdgeStyle as CyjsDirectMapper)
  cyStyle.push(baseNodeStyle as CyjsDirectMapper)

  nodeVps.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
    const cyjsVpName = getCyjsVpName(vp.name)
    if (cyjsVpName !== undefined) {
      if (vp.name === VisualPropertyName.NodeSelectedPaint) {
        const selectedNodeMapping = {
          selector: 'node:selected',
          style: {
            [cyjsVpName]: `data(${vp.name})`,
          },
        }
        cyStyle.push(selectedNodeMapping as CyjsDirectMapper)
      } else if (vp.name === VisualPropertyName.NodeLabelPosition) {
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
        const directMapping: CyjsDirectMapper = {
          selector: `node[${vp.name}]`,
          style: {
            [cyjsVpName]: `data(${vp.name})`,
          },
        }
        cyStyle.push(directMapping)
      }
    }
  })
  edgeVps.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
    const cyjsVpName = getCyjsVpName(vp.name)
    if (cyjsVpName !== undefined) {
      // Special case: selection is a special state in Cytoscape.js and
      // irregular handling is required
      if (vp.name === 'edgeSelectedPaint') {
        const selectedNodeMapping = {
          selector: 'edge:selected',
          style: {
            [cyjsVpName]: `data(${vp.name})`,
          },
        }
        cyStyle.push(selectedNodeMapping as CyjsDirectMapper)
      } else if (
        vp.name === VisualPropertyName.EdgeSourceArrowShape ||
        vp.name === VisualPropertyName.EdgeTargetArrowShape
      ) {
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

  // Need to add special class to handle mouse hover
  // This is not the part of current style object, and defined here
  // TODO: Define type for this
  const hoverMapping: any = {
    selector: `.hover`,
    style: {
      'underlay-color': 'lightblue',
      'underlay-padding': 12,
      'underlay-opacity': 0.7,
      'underlay-shape': 'roundrectangle',
    },
  }
  cyStyle.push(hoverMapping as CyjsDirectMapper)

  return cyStyle
}

export const applyViewModel = (
  cy: Core,
  networkView: NetworkView,
  visualEditorProperties: VisualEditorProperties,
): void => {
  const { nodeViews, edgeViews } = networkView
  updateCyObjects<NodeView>(nodeViews, cy.nodes(), visualEditorProperties)
  updateCyObjects<EdgeView>(edgeViews, cy.edges(), visualEditorProperties)
}

const updateCyObjects = <T extends View>(
  views: Record<IdType, T>,
  cyObjects: Collection<SingularElementArgument>,
  visualEditorProperties: VisualEditorProperties,
): void => {
  cyObjects.forEach((obj: SingularElementArgument) => {
    const cyId = obj.data('id')

    const view: View = views[cyId]
    if (view !== undefined) {
      view.values.forEach((value, key) => {
        const vpHandler = vpHandlers.get(key);
        if (vpHandler) {
          vpHandler(obj, key, value, view);
        } else {
          obj.data(key, value);
        }
      });

      if (visualEditorProperties?.nodeSizeLocked) {
        obj.data(
          NodeVisualPropertyName.NodeWidth,
          obj.data(NodeVisualPropertyName.NodeHeight),
        )
      }
      if (visualEditorProperties?.arrowColorMatchesEdge) {
        const color = obj.data(EdgeVisualPropertyName.EdgeLineColor)
        obj.data(EdgeVisualPropertyName.EdgeSourceArrowColor, color)
        obj.data(EdgeVisualPropertyName.EdgeTargetArrowColor, color)
      }
    }
  })
}
