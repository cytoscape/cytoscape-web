import { Core, EventObject, SingularElementArgument } from 'cytoscape'
import { IdType } from '../../../models/IdType'
import {
  VisualProperty,
  VisualPropertyValueType,
  VisualStyle,
} from '../../../models/VisualStyleModel'
import { getCyjsVpName } from '../../../models/VisualStyleModel/impl/cyJsVisualPropertyConverter'
import { nodeVisualProperties } from '../../../models/VisualStyleModel/impl/VisualStyleImpl'

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
  const nodeVps: Array<VisualProperty<VisualPropertyValueType>> =
    nodeVisualProperties(vs)

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

  console.log(cyStyle)
  return cyStyle
}

type SelectorType = 'node' | 'edge'

type Selector = `${SelectorType}[${IdType}]`
export interface CyjsDirectMapper {
  selector: Selector
  style: {
    [key: string]: VisualPropertyValueType
  }
}
