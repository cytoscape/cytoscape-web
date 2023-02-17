import { Core, EventObject, SingularElementArgument } from 'cytoscape'
import { IdType } from '../../../models/IdType'
import {
  VisualProperty,
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

  console.log(cyStyle)
  return cyStyle
}
