import { Core, EventObject, SingularElementArgument } from 'cytoscape'
import { IdType } from '../../models/IdType'

export const addEventHandlers = (id: IdType, cy: Core, exclusiveSelect: Function): void => {
  cy.on(
    'boxselect select',
    (e: EventObject) => {
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
