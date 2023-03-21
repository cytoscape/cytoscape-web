import { Collection, Core, SingularElementArgument } from 'cytoscape'
import { IdType } from '../../../models/IdType'
import { ValueType } from '../../../models/TableModel'
import { EdgeView, NetworkView, NodeView } from '../../../models/ViewModel'
import { View } from '../../../models/ViewModel/View'
import VisualStyleFn, {
  VisualProperty,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
} from '../../../models/VisualStyleModel'
import { CyjsDirectMapper } from '../../../models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/CyjsDirectMapper'
import { getCyjsVpName } from '../../../models/VisualStyleModel/impl/cyJsVisualPropertyConverter'

export const createCyjsDataMapper = (vs: VisualStyle): CyjsDirectMapper[] => {
  const nodeVps = VisualStyleFn.nodeVisualProperties(vs)
  const edgeVps = VisualStyleFn.edgeVisualProperties(vs)

  const cyStyle: CyjsDirectMapper[] = []
  nodeVps.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
    const cyjsVpName = getCyjsVpName(vp.name)
    if (cyjsVpName !== undefined) {
      if (vp.name === 'nodeSelectedPaint') {
        const selectedNodeMapping = {
          selector: 'node:selected',
          style: {
            [cyjsVpName]: `data(${vp.name})`,
          },
        }
        cyStyle.push(selectedNodeMapping as CyjsDirectMapper)
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
      'underlay-opacity': 0.3,
      'underlay-shape': 'roundrectangle',
    },
  }
  cyStyle.push(hoverMapping as CyjsDirectMapper)

  return cyStyle
}

export const applyViewModel = (cy: Core, networkView: NetworkView): void => {
  const { nodeViews, edgeViews } = networkView
  updateCyObjects<NodeView>(nodeViews, cy.nodes())
  updateCyObjects<EdgeView>(edgeViews, cy.edges())

  if (networkView.hoveredElement !== undefined) {
    cy.elements().removeClass('hover')
    const ele = cy.getElementById(networkView.hoveredElement)
    if (ele !== undefined) {
      ele.addClass('hover')
    }
  }
}

const updateCyObjects = <T extends View>(
  views: Record<IdType, T>,
  cyObjects: Collection<SingularElementArgument>,
): void => {
  cyObjects.forEach((obj: SingularElementArgument) => {
    const cyId = obj.data('id')

    const view: View = views[cyId]
    const { values } = view
    values.forEach((value: ValueType, key: VisualPropertyName) => {
      obj.data(key, value)
    })
  })
}
