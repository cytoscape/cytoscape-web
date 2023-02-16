import { Core, EventObject, SingularElementArgument } from 'cytoscape'
import { IdType } from '../../models/IdType'
import { EdgeView, NetworkView, NodeView } from '../../models/ViewModel'
import {
  VisualPropertyName,
  VisualPropertyValueType,
} from '../../models/VisualStyleModel'
import { CyjsDirectMapper } from '../../models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/CyjsDirectMapper'

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

export const createCyjsDataMapper = (networkView: NetworkView): void => {
  const cyStyle: CyjsDirectMapper[] = []
  // const entry: CyjsDirectMapper = {
  //   selector: `node[background-color]`,
  //   style: {
  //     'background-color': 'red',
  //   },
  // }
  // cyStyle.push(entry)

  const { nodeViews, edgeViews } = networkView
  Object.keys(nodeViews).forEach((id: IdType) => {
    const nodeView: NodeView = nodeViews[id]
    const { values } = nodeView
    values.forEach(
      (value: VisualPropertyValueType, key: VisualPropertyName) => {},
    )
  })

  Object.keys(edgeViews).forEach((id: IdType) => {
    const edgeView: EdgeView = edgeViews[id]
    const { values } = edgeView
    values.forEach(
      (value: VisualPropertyValueType, key: VisualPropertyName) => {},
    )
  })
  console.log(cyStyle)
}
