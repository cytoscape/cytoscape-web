import {
  Collection,
  Core,
  EventObject,
  SingularElementArgument,
} from 'cytoscape'
import { IdType } from '../../../models/IdType'
import { ValueType } from '../../../models/TableModel'
import { EdgeView, NetworkView, NodeView } from '../../../models/ViewModel'
import { View } from '../../../models/ViewModel/View'
import {
  VisualProperty,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
} from '../../../models/VisualStyleModel'
import { CyjsDirectMapper } from '../../../models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/CyjsDirectMapper'
import { getCyjsVpName } from '../../../models/VisualStyleModel/impl/cyJsVisualPropertyConverter'
import {
  edgeVisualProperties,
  nodeVisualProperties,
} from '../../../models/VisualStyleModel/impl/VisualStyleImpl'

export const addEventHandlers = (
  id: IdType,
  cy: Core,
  exclusiveSelect: Function,
): void => {
  cy.on('boxselect select', (e: EventObject) => {
    exclusiveSelect(
      id,
      cy
        .elements()
        .filter((e: SingularElementArgument) => e.selected())
        .map((ele: SingularElementArgument) => ele.data('id')),
    )
  })
  cy.on('tap', (e: EventObject) => {
    // check for background click
    // on background click deselect all
    if (e.target === cy) {
      exclusiveSelect(id, [])
    }
  })
}

export const createCyjsDataMapper = (vs: VisualStyle): CyjsDirectMapper[] => {
  const nodeVps = nodeVisualProperties(vs)
  const edgeVps = edgeVisualProperties(vs)

  const cyStyle: CyjsDirectMapper[] = []
  nodeVps.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
    const cyjsVpName = getCyjsVpName(vp.name)
    if (cyjsVpName !== undefined) {
      const directMapping: CyjsDirectMapper = {
        selector: `node[${vp.name}]`,
        style: {
          [cyjsVpName]: `data(${vp.name})`,
        },
      }
      cyStyle.push(directMapping)
    }
  })
  edgeVps.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
    const cyjsVpName = getCyjsVpName(vp.name)
    if (cyjsVpName !== undefined) {
      const directMapping: CyjsDirectMapper = {
        selector: `edge[${vp.name}]`,
        style: {
          [cyjsVpName]: `data(${vp.name})`,
        },
      }
      cyStyle.push(directMapping)
    }
  })

  return cyStyle
}

export const applyViewModel = (cy: Core, networkView: NetworkView): void => {
  const { nodeViews, edgeViews } = networkView
  updateCyObjects<NodeView>(nodeViews, cy.nodes())
  updateCyObjects<EdgeView>(edgeViews, cy.edges())
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
